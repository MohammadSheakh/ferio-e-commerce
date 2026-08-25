import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { correlationHeaders } from '@app/common';
import { StructuredLogger } from '@app/common';
import type { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';

const SSLC_SANDBOX = 'https://sandbox.sslcommerz.com';
const SSLC_LIVE = 'https://securepay.sslcommerz.com';

export interface InvoiceWithAttempts {
  id: string;
  number: string;
  amountMinor: number;
  currency: string;
  paid: boolean;
  organizationId: string;
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

  private credentials(): { storeId: string; password: string; baseUrl: string } | null {
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
      baseUrl: isLive ? SSLC_LIVE : process.env.PLATFORM_SSLCOMMERZ_BASE_URL || SSLC_SANDBOX,
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
  }): Promise<InvoiceWithAttempts> {
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

    const number = `SI-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    return this.platform.client.saasInvoice.create({
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
  }

  /**
   * Start an SSLCommerz hosted session for an invoice. Returns the hosted
   * redirect URL. The attempt record is created BEFORE the gateway call and
   * carries the unguessable reference that callbacks must present.
   */
  async initiatePayment(invoiceId: string): Promise<{ redirectUrl?: string; reference: string }> {
    const creds = this.credentials();
    if (!creds) throw new BadRequestException('PLATFORM_BILLING_NOT_CONFIGURED');

    const invoice = await this.platform.client.saasInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (invoice.paid) throw new BadRequestException('INVOICE_ALREADY_PAID');
    if (invoice.amountMinor <= 0) {
      throw new BadRequestException('INVOICE_AMOUNT_INVALID');
    }

    const reference = `SAAS-${invoice.number}-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
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

    const publicBase = (
      process.env.PUBLIC_API_URL || 'http://localhost:6733'
    ).replace(/\/+$/, '');
    const cbBase = publicBase.endsWith('/api/v1')
      ? publicBase
      : `${publicBase}/api/v1`;
    const callbackQs = `ref=${encodeURIComponent(reference)}`;

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
        headers: correlationHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
        body,
      });
      const raw = (await response.json()) as Record<string, unknown>;
      redirectUrl = String(raw.GatewayPageURL ?? '');
      if (!redirectUrl) throw new Error(String(raw.failedreason ?? 'session failed'));
      await this.platform.client.saasPaymentAttempt.updateMany({
        where: { reference, status: 'INITIATED' },
        data: { raw: raw as never },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.platform.client.saasPaymentAttempt.updateMany({
        where: { reference, status: 'INITIATED' },
        data: { status: 'FAILED', raw: { initiationError: message } as never },
      });
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
        await this.markFailed(attempt.reference, 'success claim without val_id');
        throw new BadRequestException('PAYMENT_VALIDATION_REQUIRED');
      }
      const validation = await this.validateWithSslcommerz(input.valId);
      if (
        validation.status !== 'VALID' && validation.status !== 'VALIDATED'
      ) {
        await this.markFailed(attempt.reference, `validation ${validation.status}`);
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
          raw: { ...input, validation } as never,
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
      return { applied: true, paid: true };
    }

    // fail / cancel / unknown-ipn outcomes are terminal evidence only.
    if (input.outcome !== 'ipn') {
      const alreadyFinal = attempt.status !== 'INITIATED';
      if (!alreadyFinal) await this.markFailed(attempt.reference, `gateway ${input.outcome}`);
      return { applied: !alreadyFinal, duplicate: alreadyFinal };
    }
    return { applied: false };
  }

  private async markFailed(reference: string, reason: string): Promise<void> {
    await this.platform.client.saasPaymentAttempt.updateMany({
      where: { reference, status: 'INITIATED' },
      data: { status: 'FAILED', raw: { failureReason: reason } as never },
    });
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
    if (!creds) throw new BadRequestException('PLATFORM_BILLING_NOT_CONFIGURED');
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
      status: String(raw.status ?? '').toUpperCase(),
      tranId: String(raw.tran_id ?? ''),
      amount: String(raw.amount ?? ''),
      currency: String(raw.currency ?? 'BDT'),
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
      select: { reference: true, provider: true, status: true, amountMinor: true, createdAt: true },
    });
  }
}
