import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommercePaymentProvider, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@app/database';
import type { PrismaClient } from '@prisma/client';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import {
  buildCallbackToken,
  verifyCallbackToken,
} from '../../../tenancy/callback-tenant.util';
import { tryGetTenantContext } from '../../../tenancy/tenant-context';
import { OrderService } from '../../order/order.service';
import { normalizeBangladeshPhone } from '../../checkout/utils/checkout.util';
import { PaymentGatewayRegistry } from '../gateways/payment-gateway.registry';
import { AuditService } from '../../audit/services/audit.service';
import { PaymentLedgerQueryDto } from '../dto/payment-ledger.dto';

@Injectable()
export class CommercePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orders: OrderService,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside callback/storefront contexts (bound via the
   * HMAC-verified callback token); legacy DB otherwise. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }

  providers() {
    return this.gateways.readiness();
  }

  async retry(
    reference: string,
    phone: string,
    provider: CommercePaymentProvider,
  ) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { reference: reference.normalize('NFKC').trim().toUpperCase() },
      include: { address: true },
    });
    if (
      !order?.address ||
      order.address.phoneNormalized !== normalizeBangladeshPhone(phone)
    ) {
      throw new NotFoundException('Order is unavailable for payment retry');
    }
    return this.initiate(order.id, order.reference, phone, provider);
  }

  async returnContext(orderId?: string) {
    const db = await this.db();
    if (!orderId) return null;
    return db.order.findUnique({
      where: { id: orderId },
      select: { reference: true, status: true, paymentStatus: true },
    });
  }

  async initiate(
    orderId: string,
    reference: string,
    phone: string,
    provider: CommercePaymentProvider,
  ) {
    const db = await this.db();
    const adapter = this.gateways.get(provider);
    if (!adapter.isConfigured())
      throw new ConflictException(`${provider} is not configured`);
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    // Ownership proof: caller must know the order reference AND the phone
    // used at placement. Prevents anonymous initiation against arbitrary
    // order IDs (IDOR / gateway-session spam).
    if (
      !order?.address ||
      !reference ||
      order.reference !== reference.normalize('NFKC').trim().toUpperCase() ||
      order.address.phoneNormalized !== normalizeBangladeshPhone(phone)
    ) {
      throw new NotFoundException('Order is unavailable for payment');
    }
    if (order.paymentMethod !== 'PREPAID' || order.paymentStatus === 'PAID') {
      throw new ConflictException(
        'Order is not eligible for prepaid initiation',
      );
    }
    if (order.checkoutDraftId) {
      const draft = await db.checkoutDraft.findUnique({
        where: { id: order.checkoutDraftId },
      });
      if (draft?.paymentProvider !== provider)
        throw new ConflictException(
          'Payment provider changed; preview checkout again',
        );
    }
    const existing = order.paymentAttempts[0];
    if (
      existing &&
      existing.provider === provider &&
      ['PENDING', 'INITIATING'].includes(existing.status) &&
      existing.redirectUrl &&
      (!existing.expiresAt || existing.expiresAt > new Date())
    ) {
      return this.publicAttempt(existing);
    }

    const merchantTransactionId =
      `FER${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
        .slice(0, 30)
        .toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.$transaction(
      (transaction) =>
        this.orders.preparePrepaidRetry(transaction, order.id, expiresAt),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const attempt = await db.commercePaymentAttempt.create({
      data: {
        merchantTransactionId,
        provider,
        status: 'INITIATING',
        amount: order.total,
        currency: order.currency,
        orderId: order.id,
        initiatedAt: new Date(),
        expiresAt,
      },
    });
    const rawPublicUrl = this.config
      .get<string>('PUBLIC_API_URL', 'http://localhost:6733')
      .replace(/\/+$/, '');
    const callbackBase = rawPublicUrl.endsWith('/api/v1')
      ? rawPublicUrl
      : `${rawPublicUrl}/api/v1`;
    // MT-7 §10.6: bind callbacks to THIS organization with an HMAC-signed
    // token embedded in the URLs we hand the gateway. Providers echo our URLs
    // verbatim; forgery fails signature verification server-side.
    let callbackTenantQuery = { value: '' };
    const context = tryGetTenantContext();
    if (context && this.config.get<string>('PLATFORM_CALLBACK_SECRET')) {
      const token = buildCallbackToken(
        context.organizationId,
        this.config.get<string>('PLATFORM_CALLBACK_SECRET'),
      );
      callbackTenantQuery = { value: `&cbt=${encodeURIComponent(token)}` };
    }
    try {
      const result = await adapter.initiate({
        merchantTransactionId,
        amount: order.total,
        currency: order.currency,
        orderReference: order.reference,
        customer: {
          name: order.address.recipientName,
          email:
            order.address.email ||
            this.config.get<string>(
              'PAYMENT_FALLBACK_EMAIL',
              'payments@ferio.local',
            ),
          phone: order.address.phoneNormalized,
          address: `${order.address.detailedAddress}, ${order.address.area}`,
          city: order.address.district,
        },
        successUrl: `${callbackBase}/payments/callback/${provider}/success?merchantTransactionId=${merchantTransactionId}${callbackTenantQuery.value}`,
        failUrl: `${callbackBase}/payments/callback/${provider}/fail?merchantTransactionId=${merchantTransactionId}${callbackTenantQuery.value}`,
        cancelUrl: `${callbackBase}/payments/callback/${provider}/cancel?merchantTransactionId=${merchantTransactionId}${callbackTenantQuery.value}`,
        ipnUrl: `${callbackBase}/payments/callback/${provider}/ipn?merchantTransactionId=${merchantTransactionId}${callbackTenantQuery.value}`,
      });
      return this.publicAttempt(
        await db.commercePaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'PENDING',
            redirectUrl: result.redirectUrl,
            providerSessionId: result.providerSessionId,
            initiationResponse: result.raw as Prisma.InputJsonValue,
          },
        }),
      );
    } catch (error) {
      await db.commercePaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          failureCode: 'INITIATION_FAILED',
          failureMessage:
            error instanceof Error
              ? error.message
              : 'Payment initiation failed',
          completedAt: new Date(),
        },
      });
      throw new ConflictException(
        error instanceof Error ? error.message : 'Payment initiation failed',
      );
    }
  }

  /**
   * Process Gateway Callbacks & IPNs (e.g. SSLCommerz success/fail/cancel/ipn)
   * --------------------------------------------------------------------------
   * 1. Idempotency Check: Prevents duplicate processing via deduplication Key.
   * 2. Server Validation: Calls Gateway.validate() to verify with provider.
   * 3. Fraud Prevention: Checks amount, currency, and risk level.
   * 4. DB Transaction: Updates payment attempt to SUCCEEDED and confirms order.
   */
  async processCallback(
    provider: CommercePaymentProvider,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const db = await this.db();
    const adapter = this.gateways.get(provider);

    // Step 1: Generate unique deduplication key for callback logging
    const key = createHash('sha256')
      .update(`${provider}:${eventType}:${JSON.stringify(payload)}`)
      .digest('hex');

    const existingLog = await db.commercePaymentCallback.findUnique({
      where: { deduplicationKey: key },
    });

    if (
      existingLog?.status === 'VALIDATED' ||
      existingLog?.status === 'DUPLICATE'
    )
      return { duplicate: true };

    const log =
      existingLog ??
      (await db.commercePaymentCallback.create({
        data: {
          deduplicationKey: key,
          provider,
          eventType,
          payload: payload as Prisma.InputJsonValue,
        },
      }));

    try {
      // Step 2: Validate transaction with Gateway (e.g. SSLCommerz server-to-server API)
      const validation = await adapter.validate(payload);
      const attempt = await db.commercePaymentAttempt.findUnique({
        where: { merchantTransactionId: validation.merchantTransactionId },
        include: { order: { select: { paymentStatus: true } } },
      });

      if (!attempt || attempt.provider !== provider)
        throw new Error('Payment attempt identity does not match');

      // If already processed as SUCCEEDED, mark log as duplicate
      if (attempt.status === 'SUCCEEDED') {
        await db.commercePaymentCallback.update({
          where: { id: log.id },
          data: {
            attemptId: attempt.id,
            status: 'DUPLICATE',
            processedAt: new Date(),
          },
        });
        return { duplicate: true, orderId: attempt.orderId };
      }

      // Step 3: Handle Successful Payment Validation
      if (validation.outcome === 'SUCCEEDED') {
        // Amount, currency, and risk level validation
        if (
          validation.amount !== attempt.amount ||
          validation.currency?.toUpperCase() !==
            attempt.currency.toUpperCase() ||
          validation.riskLevel === '1'
        ) {
          throw new Error(
            'Provider amount, currency, or risk validation failed',
          );
        }

        // Step 4: Atomic DB Transaction - Update order to PAID/CONFIRMED & mark attempt SUCCEEDED
        await db.$transaction(
          async (transaction) => {
            // Confirm prepaid order (paymentStatus: PAID, status: CONFIRMED)
            await this.orders.confirmVerifiedPrepaidOrder(
              transaction,
              attempt.orderId,
            );

            // Update payment attempt record with bank_tran_id and val_id
            await transaction.commercePaymentAttempt.update({
              where: { id: attempt.id },
              data: {
                status: 'SUCCEEDED',
                providerTransactionId: validation.providerTransactionId,
                providerValidationId: validation.validationId,
                validatedResponse: validation.raw as Prisma.InputJsonValue,
                completedAt: new Date(),
              },
            });

            // Update callback audit log
            await transaction.commercePaymentCallback.update({
              where: { id: log.id },
              data: {
                attemptId: attempt.id,
                status: 'VALIDATED',
                processedAt: new Date(),
              },
            });
            await this.audit.record(
              {
                action: 'PAYMENT_PROVIDER_STATE_APPLIED',
                entityType: 'Order',
                entityId: attempt.orderId,
                source: 'PROVIDER',
                previousValue: { paymentStatus: attempt.order.paymentStatus },
                newValue: {
                  paymentStatus: 'PAID',
                  paymentAttemptStatus: 'SUCCEEDED',
                },
                metadata: {
                  provider,
                  eventType,
                  attemptId: attempt.id,
                  callbackId: log.id,
                  providerTransactionId: validation.providerTransactionId,
                },
              },
              transaction,
            );
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return { paid: true, orderId: attempt.orderId };
      }
      // Browser-reported fail/cancel outcomes cannot be verified against the
      // provider. Record them as evidence but never mutate attempt or order
      // state — the payment-recovery expiry sweep is the authoritative path
      // for abandoned/failed sessions.
      if (validation.outcome === 'UNVERIFIED_REPORT') {
        await db.commercePaymentCallback.update({
          where: { id: log.id },
          data: {
            status: 'REJECTED',
            processedAt: new Date(),
            errorMessage: 'Unverified browser report ignored',
          },
        });
        return { paid: false, unverified: true };
      }

      const status =
        validation.outcome === 'CANCELLED'
          ? 'CANCELLED'
          : validation.outcome === 'FAILED'
            ? 'FAILED'
            : validation.outcome === 'PENDING'
              ? 'PENDING'
              : 'UNKNOWN';
      await db.$transaction(async (transaction) => {
        await transaction.commercePaymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status,
            validatedResponse: validation.raw as Prisma.InputJsonValue,
            completedAt: ['FAILED', 'CANCELLED'].includes(status)
              ? new Date()
              : undefined,
          },
        });
        await transaction.commercePaymentCallback.update({
          where: { id: log.id },
          data: {
            attemptId: attempt.id,
            status: status === 'UNKNOWN' ? 'REJECTED' : 'VALIDATED',
            processedAt: new Date(),
          },
        });
        const changesOrder = ['FAILED', 'CANCELLED'].includes(status);
        if (changesOrder) {
          await transaction.order.update({
            where: { id: attempt.orderId },
            data: { paymentStatus: 'FAILED' },
          });
        }
        await this.audit.record(
          {
            action: 'PAYMENT_PROVIDER_STATE_APPLIED',
            entityType: changesOrder ? 'Order' : 'CommercePaymentAttempt',
            entityId: changesOrder ? attempt.orderId : attempt.id,
            source: 'PROVIDER',
            previousValue: {
              paymentStatus: attempt.order.paymentStatus,
              paymentAttemptStatus: attempt.status,
            },
            newValue: {
              paymentStatus: changesOrder
                ? 'FAILED'
                : attempt.order.paymentStatus,
              paymentAttemptStatus: status,
            },
            metadata: {
              provider,
              eventType,
              attemptId: attempt.id,
              callbackId: log.id,
            },
          },
          transaction,
        );
      });
      return { paid: false, status, orderId: attempt.orderId };
    } catch (error) {
      await db.commercePaymentCallback.update({
        where: { id: log.id },
        data: {
          status: 'REJECTED',
          errorMessage:
            error instanceof Error ? error.message : 'Callback rejected',
          processedAt: new Date(),
        },
      });
      // Do not reflect internal validation details to untrusted callers.
      throw new ConflictException(
        'Payment callback could not be validated. If you were completing a payment, check your order status or contact support.',
      );
    }
  }

  async listAttempts(query: PaymentLedgerQueryDto) {
    const db = await this.db();
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.CommercePaymentAttemptWhereInput = {
      provider: query.provider,
      status: query.status,
      order: {
        paymentStatus: query.paymentStatus,
        refundStatus: query.refundStatus,
      },
      OR: search
        ? [
            {
              merchantTransactionId: { contains: search, mode: 'insensitive' },
            },
            {
              providerTransactionId: { contains: search, mode: 'insensitive' },
            },
            { order: { reference: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    const [items, total] = await Promise.all([
      db.commercePaymentAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          order: {
            select: {
              id: true,
              reference: true,
              paymentStatus: true,
              refundStatus: true,
              total: true,
            },
          },
          callbacks: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
      db.commercePaymentAttempt.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  async attemptDetail(id: string) {
    const db = await this.db();
    const attempt = await db.commercePaymentAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        merchantTransactionId: true,
        provider: true,
        status: true,
        amount: true,
        currency: true,
        providerSessionId: true,
        providerTransactionId: true,
        providerValidationId: true,
        failureCode: true,
        failureMessage: true,
        expiresAt: true,
        initiatedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            paymentStatus: true,
            refundStatus: true,
            total: true,
            currency: true,
            refunds: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                reference: true,
                status: true,
                method: true,
                amount: true,
                currency: true,
                provider: true,
                providerRefundId: true,
                failureReason: true,
                processedAt: true,
                completedAt: true,
                createdAt: true,
              },
            },
          },
        },
        callbacks: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            eventType: true,
            errorMessage: true,
            processedAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Payment attempt not found');
    return attempt;
  }

  async eligibleExpiredAttempts(limit: number) {
    const db = await this.db();
    return db.commercePaymentAttempt.findMany({
      where: {
        status: { in: ['INITIATING', 'PENDING'] },
        expiresAt: { lte: new Date() },
        order: { paymentStatus: { not: 'PAID' } },
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
      select: { id: true, orderId: true },
    });
  }

  async expireAttempt(attemptId: string) {
    const db = await this.db();
    return db.$transaction(
      async (transaction) => {
        const attempt = await transaction.commercePaymentAttempt.findUnique({
          where: { id: attemptId },
        });
        if (
          !attempt ||
          !['INITIATING', 'PENDING'].includes(attempt.status) ||
          !attempt.expiresAt ||
          attempt.expiresAt > new Date()
        ) {
          return { attemptId, skipped: true };
        }
        const claimed = await transaction.commercePaymentAttempt.updateMany({
          where: { id: attempt.id, status: { in: ['INITIATING', 'PENDING'] } },
          data: {
            status: 'EXPIRED',
            failureCode: 'PAYMENT_WINDOW_EXPIRED',
            failureMessage:
              'Payment was not verified before the reserved window ended',
            completedAt: new Date(),
          },
        });
        if (claimed.count === 0) return { attemptId, skipped: true };
        await this.orders.expirePrepaidOrder(transaction, attempt.orderId);
        await this.audit.record(
          {
            action: 'PAYMENT_ATTEMPT_EXPIRED',
            entityType: 'CommercePaymentAttempt',
            entityId: attempt.id,
            source: 'SYSTEM',
            previousValue: { status: attempt.status },
            newValue: { status: 'EXPIRED' },
            metadata: { orderId: attempt.orderId },
          },
          transaction,
        );
        return {
          attemptId,
          orderId: attempt.orderId,
          status: 'EXPIRED' as const,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private publicAttempt(attempt: {
    id: string;
    orderId: string;
    provider: CommercePaymentProvider;
    status: string;
    redirectUrl: string | null;
    merchantTransactionId: string;
  }) {
    return {
      id: attempt.id,
      orderId: attempt.orderId,
      provider: attempt.provider,
      status: attempt.status,
      redirectUrl: attempt.redirectUrl,
      merchantTransactionId: attempt.merchantTransactionId,
    };
  }
}
