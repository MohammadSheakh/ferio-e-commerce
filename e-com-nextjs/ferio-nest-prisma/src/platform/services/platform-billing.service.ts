import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  correlationHeaders,
  StructuredLogger,
  TenantMetrics,
} from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';
import { toPlatformJsonInput } from '../utils/json-input.util';

const SSLC_SANDBOX = 'https://sandbox.sslcommerz.com';
const SSLC_LIVE = 'https://securepay.sslcommerz.com';
const DEFAULT_STALE_ATTEMPT_MINUTES = 30;
const MAX_RECOVERY_BATCH = 100;

function providerText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : fallback;
}

export interface InvoiceWithAttempts {
  id: string;
  number: string;
  amountMinor: number;
  currency: string;
  paid: boolean;
  organizationId: string;
}

export interface PlatformReceipt {
  receiptNumber: string;
  invoiceNumber: string;
  organizationId: string;
  amountMinor: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  provider: string | null;
  providerReference: string | null;
}

interface ManualBillingAction {
  actorId?: string;
  reason: string;
}

/**
 * Platform SaaS billing via SSLCommerz (PO-006).
 *
 * Financial isolation is structural: every row lives in the control plane
 * (`SaasInvoice`/`SaasPaymentAttempt`) and NOTHING here ever touches a
 * tenant commerce `Payment`, wallet, COD, refund, or settlement record.
 *
 * Callback integrity mirrors the commerce pattern: the callback URL embeds
 * an unguessable payment reference, and success is only ever accepted after
 * server-to-server validation against SSLCommerz's validator API using the
 * returned val_id. Duplicate callbacks are absorbed idempotently.
 */
@Injectable()
export class PlatformBillingService {
  private readonly logger = new StructuredLogger(PlatformBillingService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  private credentials(): {
    storeId: string;
    password: string;
    baseUrl: string;
  } | null {
    const storeId =
      process.env.PLATFORM_SSLCOMMERZ_STORE_ID ||
      process.env.SSL_STORE_ID ||
      '';
    const password =
      process.env.PLATFORM_SSLCOMMERZ_STORE_PASSWORD ||
      process.env.SSL_STORE_PASSWORD ||
      '';
    if (!storeId || !password) return null;
    const isLive = process.env.PLATFORM_SSLCOMMERZ_IS_LIVE === 'true';
    return {
      storeId,
      password,
      baseUrl: isLive
        ? SSLC_LIVE
        : process.env.PLATFORM_SSLCOMMERZ_BASE_URL || SSLC_SANDBOX,
    };
  }

  billingConfigured(): boolean {
    return this.credentials() !== null;
  }

  /** Create (or reuse) the open invoice for a subscription's current period. */
  async ensureInvoice(input: {
    organizationId: string;
    periodStart: Date;
    periodEnd: Date;
    actorId?: string;
    reason: string;
  }): Promise<InvoiceWithAttempts> {
    this.assertManualReason(input.reason);
    if (
      Number.isNaN(input.periodStart.getTime()) ||
      Number.isNaN(input.periodEnd.getTime()) ||
      input.periodEnd <= input.periodStart
    ) {
      throw new BadRequestException('INVOICE_PERIOD_INVALID');
    }
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId: input.organizationId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');

    const existing = await this.platform.client.saasInvoice.findFirst({
      where: {
        organizationId: input.organizationId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && !existing.paid) return existing;

    const number = `SI-${new Date().toISOString().slice(0, 7).replace('-', '')}-${randomBytes(
      4,
    )
      .toString('hex')
      .toUpperCase()}`;
    const created = await this.platform.client.saasInvoice.create({
      data: {
        number,
        organizationId: input.organizationId,
        subscriptionId: subscription.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        amountMinor: subscription.plan.amountMinor,
        currency: 'BDT',
      },
    });
    await this.audit.record({
      action: 'SAAS_INVOICE_MANUALLY_CREATED',
      entityType: 'SaasInvoice',
      entityId: created.id,
      actorId: input.actorId,
      newValue: {
        organizationId: input.organizationId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        amountMinor: created.amountMinor,
      },
      metadata: { reason: input.reason.trim() },
    });
    TenantMetrics.increment('platform_billing_invoice_created');
    return created;
  }

  /**
   * Start an SSLCommerz hosted session for an invoice. Returns the hosted
   * redirect URL. The attempt record is created BEFORE the gateway call and
   * carries the unguessable reference that callbacks must present.
   */
  async initiatePayment(
    invoiceId: string,
    action: ManualBillingAction,
  ): Promise<{ redirectUrl?: string; reference: string }> {
    this.assertManualReason(action.reason);
    const creds = this.credentials();
    if (!creds)
      throw new BadRequestException('PLATFORM_BILLING_NOT_CONFIGURED');

    const invoice = await this.platform.client.saasInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (invoice.paid) throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (invoice.amountMinor <= 0) {
      throw new BadRequestException('INVOICE_AMOUNT_INVALID');
    }

    const reference = `SAAS-${invoice.number}-${Date.now().toString(36).toUpperCase()}-${randomBytes(
      4,
    )
      .toString('hex')
      .toUpperCase()}`;

    await this.platform.client.saasPaymentAttempt.create({
      data: {
        invoiceId: invoice.id,
        provider: 'SSLCOMMERZ',
        reference,
        status: 'INITIATED',
        amountMinor: invoice.amountMinor,
      },
    });
    await this.audit.record({
      action: 'SAAS_PAYMENT_MANUALLY_INITIATED',
      entityType: 'SaasPaymentAttempt',
      entityId: reference,
      actorId: action.actorId,
      newValue: { invoiceId: invoice.id, amountMinor: invoice.amountMinor },
      metadata: { reason: action.reason.trim() },
    });
    TenantMetrics.increment('platform_billing_payment_initiated');

    const publicBase = (
      process.env.PUBLIC_API_URL || 'http://localhost:6733'
    ).replace(/\/+$/, '');
    const cbBase = publicBase.endsWith('/api/v1')
      ? publicBase
      : `${publicBase}/api/v1`;
    const body = new URLSearchParams({
      store_id: creds.storeId,
      store_passwd: creds.password,
      total_amount: (invoice.amountMinor / 100).toFixed(2),
      currency: 'BDT',
      tran_id: reference,
      success_url: `${cbBase}/platform/billing/callback?ref=${encodeURIComponent(reference)}&outcome=success`,
      fail_url: `${cbBase}/platform/billing/callback?ref=${encodeURIComponent(reference)}&outcome=fail`,
      cancel_url: `${cbBase}/platform/billing/callback?ref=${encodeURIComponent(reference)}&outcome=cancel`,
      ipn_url: `${cbBase}/platform/billing/callback?ref=${encodeURIComponent(reference)}&outcome=ipn`,
      cus_name: 'Ferio Platform Customer',
      cus_email: this.contactEmail(invoice.organizationId),
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      num_of_item: '1',
      product_name: `Ferio ${invoice.number}`,
      product_category: 'saas-subscription',
      product_profile: 'general',
    });

    let redirectUrl = '';
    try {
      const response = await fetch(`${creds.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: correlationHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body,
      });
      const raw = (await response.json()) as Record<string, unknown>;
      redirectUrl = providerText(raw.GatewayPageURL);
      if (!redirectUrl)
        throw new Error(providerText(raw.failedreason, 'session failed'));
      await this.platform.client.saasPaymentAttempt.updateMany({
        where: { reference, status: 'INITIATED' },
        data: { raw: toPlatformJsonInput(raw) },
      });
      TenantMetrics.increment('platform_billing_payment_session_created');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.platform.client.saasPaymentAttempt.updateMany({
        where: { reference, status: 'INITIATED' },
        data: {
          status: 'FAILED',
          raw: toPlatformJsonInput({ initiationError: message }),
        },
      });
      TenantMetrics.increment('platform_billing_payment_failed');
      throw new BadRequestException('PAYMENT_SESSION_FAILED');
    }
    return { redirectUrl, reference };
  }

  private contactEmail(organizationId: string): string {
    // Synchronous context not worth a query: SSLCommerz requires an email;
    // use a stable platform address — real owner contact lives on invoices.
    void organizationId;
    return 'billing@ferio.local';
  }

  private assertManualReason(reason: string): void {
    if (reason.trim().length < 10) {
      throw new BadRequestException('BILLING_REASON_REQUIRED');
    }
  }

  /**
   * Authoritative outcome application. Idempotent by construction:
   * transition only fires from INITIATED, and duplicate calls report
   * `duplicate` without side effects.
   */
  async applyCallbackOutcome(input: {
    reference: string;
    valId?: string;
    outcome: 'success' | 'fail' | 'cancel' | 'ipn';
  }): Promise<{ applied: boolean; duplicate?: boolean; paid?: boolean }> {
    const attempt = await this.platform.client.saasPaymentAttempt.findUnique({
      where: { reference: input.reference },
      include: { invoice: true },
    });
    if (!attempt) throw new NotFoundException('PAYMENT_ATTEMPT_NOT_FOUND');

    // Idempotency: any non-INITIATED attempt has already reached a terminal
    // state — duplicate deliveries are absorbed without side effects.
    if (attempt.status !== 'INITIATED') {
      return {
        applied: false,
        duplicate: true,
        ...(attempt.status === 'SUCCEEDED' ? { paid: true } : {}),
      };
    }

    if (input.outcome === 'success') {
      if (!input.valId) {
        // A success claim without a verifiable val_id is rejected outright.
        await this.markFailed(
          attempt.reference,
          'success claim without val_id',
        );
        throw new BadRequestException('PAYMENT_VALIDATION_REQUIRED');
      }
      const validation = await this.validateWithSslcommerz(input.valId);
      if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
        await this.markFailed(
          attempt.reference,
          `validation ${validation.status}`,
        );
        return { applied: true };
      }
      if (validation.tranId !== attempt.reference) {
        await this.markFailed(attempt.reference, 'tran_id mismatch');
        throw new BadRequestException('PAYMENT_REFERENCE_MISMATCH');
      }
      if (this.minor(validation.amount) !== attempt.amountMinor) {
        await this.markFailed(attempt.reference, 'amount mismatch');
        throw new BadRequestException('PAYMENT_AMOUNT_MISMATCH');
      }

      // Atomic single-transition: concurrent/duplicate callbacks see count 0.
      const updated = await this.platform.client.saasPaymentAttempt.updateMany({
        where: { reference: attempt.reference, status: 'INITIATED' },
        data: {
          status: 'SUCCEEDED',
          raw: toPlatformJsonInput({ ...input, validation }),
        },
      });
      if (updated.count === 0) return { applied: false, duplicate: true };

      await this.platform.client.saasInvoice.update({
        where: { id: attempt.invoiceId },
        data: { paid: true },
      });
      await this.audit.record({
        action: 'SAAS_PAYMENT_SUCCEEDED',
        entityType: 'SaasPaymentAttempt',
        entityId: attempt.id,
        newValue: {
          invoiceNumber: attempt.invoice.number,
          amountMinor: attempt.amountMinor,
          valId: input.valId,
        },
      });
      TenantMetrics.increment('platform_billing_payment_succeeded');
      return { applied: true, paid: true };
    }

    // fail / cancel / unknown-ipn outcomes are terminal evidence only.
    if (input.outcome !== 'ipn') {
      const alreadyFinal = attempt.status !== 'INITIATED';
      if (!alreadyFinal)
        await this.markFailed(attempt.reference, `gateway ${input.outcome}`);
      return { applied: !alreadyFinal, duplicate: alreadyFinal };
    }
    return { applied: false };
  }

  private async markFailed(reference: string, reason: string): Promise<void> {
    await this.platform.client.saasPaymentAttempt.updateMany({
      where: { reference, status: 'INITIATED' },
      data: {
        status: 'FAILED',
        raw: toPlatformJsonInput({ failureReason: reason }),
      },
    });
    TenantMetrics.increment('platform_billing_payment_failed');
    this.logger.warn('platform_payment_failed', { reference });
  }

  /** Server-to-server validation against SSLCommerz (same API as commerce). */
  private async validateWithSslcommerz(valId: string): Promise<{
    status: string;
    tranId: string;
    amount: string;
    currency: string;
  }> {
    const creds = this.credentials();
    if (!creds)
      throw new BadRequestException('PLATFORM_BILLING_NOT_CONFIGURED');
    const qs = new URLSearchParams({
      val_id: valId,
      store_id: creds.storeId,
      store_passwd: creds.password,
      format: 'json',
    });
    const response = await fetch(
      `${creds.baseUrl}/validator/api/validationserverAPI.php?${qs}`,
      { headers: correlationHeaders() },
    );
    const raw = (await response.json()) as Record<string, unknown>;
    return {
      status: providerText(raw.status).toUpperCase(),
      tranId: providerText(raw.tran_id),
      amount: providerText(raw.amount),
      currency: providerText(raw.currency, 'BDT'),
    };
  }

  /** Major-unit parse mirroring commerce behavior (two decimals expected). */
  private minor(majorAmount: string): number {
    return Math.round(Number(majorAmount) * 100);
  }

  listInvoices(organizationId?: string) {
    return this.platform.client.saasInvoice.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        paymentAttempts: {
          select: { reference: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  attemptsForInvoice(invoiceId: string) {
    return this.platform.client.saasPaymentAttempt.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      select: {
        reference: true,
        provider: true,
        status: true,
        amountMinor: true,
        createdAt: true,
      },
    });
  }

  /**
   * Close abandoned hosted sessions without charging or mutating invoices.
   * Operators can then start a fresh idempotent attempt for the invoice.
   */
  async recoverStalePaymentAttempts(
    staleAfterMinutes = DEFAULT_STALE_ATTEMPT_MINUTES,
    now = new Date(),
  ): Promise<{ examined: number; recovered: number; staleBefore: Date }> {
    if (
      !Number.isInteger(staleAfterMinutes) ||
      staleAfterMinutes < 5 ||
      staleAfterMinutes > 1440
    ) {
      throw new BadRequestException('PAYMENT_RECOVERY_WINDOW_INVALID');
    }
    if (Number.isNaN(now.getTime())) {
      throw new BadRequestException('PAYMENT_RECOVERY_TIME_INVALID');
    }

    const staleBefore = new Date(now.getTime() - staleAfterMinutes * 60_000);
    const attempts = await this.platform.client.saasPaymentAttempt.findMany({
      where: { status: 'INITIATED', createdAt: { lt: staleBefore } },
      orderBy: { createdAt: 'asc' },
      take: MAX_RECOVERY_BATCH,
      select: {
        id: true,
        reference: true,
        invoiceId: true,
        amountMinor: true,
      },
    });
    let recovered = 0;
    for (const attempt of attempts) {
      const result = await this.platform.client.saasPaymentAttempt.updateMany({
        where: { id: attempt.id, status: 'INITIATED' },
        data: {
          status: 'FAILED',
          raw: toPlatformJsonInput({
            recoveryReason: 'STALE_INITIATED_PAYMENT_ATTEMPT',
            recoveredAt: now,
          }),
        },
      });
      if (result.count !== 1) continue;
      recovered += 1;
      await this.audit.record({
        action: 'SAAS_PAYMENT_ATTEMPT_RECOVERED',
        entityType: 'SaasPaymentAttempt',
        entityId: attempt.id,
        newValue: {
          reference: attempt.reference,
          invoiceId: attempt.invoiceId,
          amountMinor: attempt.amountMinor,
          status: 'FAILED',
        },
        metadata: {
          staleAfterMinutes,
          recoveredAt: now,
        },
      });
    }
    if (recovered > 0) {
      TenantMetrics.increment(
        'platform_billing_payment_recovered',
        {},
        recovered,
      );
    }
    return { examined: attempts.length, recovered, staleBefore };
  }

  /** Return a bounded receipt projection only after control-plane payment. */
  async receipt(invoiceId: string): Promise<PlatformReceipt> {
    const invoice = await this.platform.client.saasInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        paymentAttempts: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { provider: true, reference: true, updatedAt: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (!invoice.paid) throw new BadRequestException('RECEIPT_NOT_AVAILABLE');

    const successfulAttempt = invoice.paymentAttempts[0] ?? null;
    return {
      receiptNumber: `RC-${invoice.number}`,
      invoiceNumber: invoice.number,
      organizationId: invoice.organizationId,
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      paidAt: successfulAttempt?.updatedAt ?? null,
      provider: successfulAttempt?.provider ?? null,
      providerReference: successfulAttempt?.reference ?? null,
    };
  }
}
