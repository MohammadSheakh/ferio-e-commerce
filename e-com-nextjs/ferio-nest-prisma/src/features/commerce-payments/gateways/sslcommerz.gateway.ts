import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { correlationHeaders } from '@app/common';
import {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentGateway,
  ValidatePaymentResult,
} from './payment.gateway';

/**
 * SSLCommerz Payment Gateway Implementation
 * -------------------------------------------------------------
 * SSLCommerz hosted payment gateway integration for Ferio Platform.
 * Handles payment session initiation, hosted page redirect generation,
 * and server-to-server validation (validationserverAPI.php).
 */
@Injectable()
export class SslcommerzGateway extends PaymentGateway {
  readonly provider = 'SSLCOMMERZ' as const;
  readonly displayName = 'SSLCommerz';
  constructor(config: ConfigService) {
    super(config);
  }

  /**
   * Checks if SSLCommerz store credentials are configured in .env
   */
  isConfigured() {
    return Boolean(this.storeId() && this.password());
  }

  /**
   * Initiate SSLCommerz Hosted Payment Session
   * Sends order & customer details to SSLCommerz gwprocess API
   * and returns GatewayPageURL for user redirect.
   */
  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const body = new URLSearchParams({
      store_id: this.storeId(),
      store_passwd: this.password(),
      total_amount: this.providerAmount(input.amount), // Convert minor unit (poisha) to major BDT amount
      currency: input.currency,
      tran_id: input.merchantTransactionId, // Unique merchant transaction ID (e.g. FER...)
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      ipn_url: input.ipnUrl,
      cus_name: input.customer.name.slice(0, 50),
      cus_email: input.customer.email,
      cus_add1: input.customer.address.slice(0, 50),
      cus_city: input.customer.city.slice(0, 50),
      cus_country: 'Bangladesh',
      cus_phone: input.customer.phone,
      shipping_method: 'YES',
      ship_name: input.customer.name.slice(0, 50),
      ship_add1: input.customer.address.slice(0, 50),
      ship_city: input.customer.city.slice(0, 50),
      ship_state: input.customer.city.slice(0, 50),
      ship_country: 'Bangladesh',
      ship_postcode: '1000',
      product_name: `Ferio order ${input.orderReference}`,
      product_category: 'ecommerce',
      product_profile: 'general',
      // Custom metadata passed to SSLCommerz callback payload
      value_a: input.orderReference,
      value_b: input.merchantTransactionId,
      value_c: input.customer.email,
      value_d: input.amount.toString(),
    });

    // Call SSLCommerz Session API
    const raw = await this.json(
      await fetch(`${this.baseUrl()}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: correlationHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body,
      }),
    );

    const redirectUrl = String(raw.GatewayPageURL ?? '');
    if (!redirectUrl)
      throw new Error(
        String(raw.failedreason ?? 'SSLCommerz initiation failed'),
      );

    return {
      redirectUrl,
      providerSessionId: String(raw.sessionkey ?? ''),
      raw,
    };
  }

  /**
   * Server-to-Server Payment Validation
   * Calls SSLCommerz validationserverAPI using `val_id` to verify transaction authenticity.
   */
  async validate(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult> {
    const validationId = String(payload.val_id ?? '');

    // Without a val_id there is nothing this server can verify with the
    // provider. Browser-reported fail/cancel outcomes are recorded as an
    // UNVERIFIED_REPORT and must never mutate attempt or order state — a
    // forged callback would otherwise be able to kill in-flight payments.
    if (!validationId)
      return {
        outcome: 'UNVERIFIED_REPORT' as const,
        merchantTransactionId: String(
          payload.tran_id ?? payload.merchantTransactionId ?? '',
        ),
        raw: payload,
      };

    // Query SSLCommerz server-to-server validation endpoint
    const query = new URLSearchParams({
      val_id: validationId,
      store_id: this.storeId(),
      store_passwd: this.password(),
      format: 'json',
    });
    const raw = await this.json(
      await fetch(
        `${this.baseUrl()}/validator/api/validationserverAPI.php?${query}`,
        { headers: correlationHeaders() },
      ),
    );

    const status = String(raw.status ?? '').toUpperCase();
    return {
      outcome: ['VALID', 'VALIDATED'].includes(status)
        ? 'SUCCEEDED'
        : status === 'PENDING'
          ? 'PENDING'
          : 'FAILED',
      merchantTransactionId: String(raw.tran_id ?? payload.tran_id ?? ''),
      amount: this.minorAmount(raw.amount),
      currency: String(raw.currency_type ?? payload.currency ?? ''),
      providerTransactionId: String(raw.bank_tran_id ?? ''),
      validationId,
      riskLevel: String(raw.risk_level ?? '0'),
      raw: { ...payload, ...raw },
    };
  }

  protected credentialKeys() {
    return ['SSLCOMMERZ_STORE_ID', 'SSLCOMMERZ_STORE_PASSWORD'];
  }

  /**
   * Resolves SSLCommerz Store ID (supports both SSLCOMMERZ_STORE_ID and SSL_STORE_ID)
   */
  private storeId() {
    return this.value('SSLCOMMERZ_STORE_ID') || this.value('SSL_STORE_ID');
  }

  /**
   * Resolves SSLCommerz Store Password (supports both SSLCOMMERZ_STORE_PASSWORD and SSL_STORE_PASSWORD)
   */
  private password() {
    return (
      this.value('SSLCOMMERZ_STORE_PASSWORD') ||
      this.value('SSL_STORE_PASSWORD')
    );
  }

  /**
   * Resolves SSLCommerz Base API URL depending on Sandbox vs Live configuration
   */
  private baseUrl() {
    const isLive =
      this.value('is_live') === 'true' ||
      this.value('SSLCOMMERZ_IS_LIVE') === 'true';
    if (isLive) return 'https://securepay.sslcommerz.com';
    return this.value('SSLCOMMERZ_BASE_URL', 'https://sandbox.sslcommerz.com');
  }
}
