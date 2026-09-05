import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { correlationHeaders } from '@app/common';
import {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentGateway,
  ValidatePaymentResult,
} from './payment.gateway';

@Injectable()
export class AamarpayGateway extends PaymentGateway {
  readonly provider = 'AAMARPAY' as const;
  readonly displayName = 'aamarPay';
  constructor(config: ConfigService) {
    super(config);
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const request = {
      store_id: this.storeId(),
      signature_key: this.signatureKey(),
      cus_name: input.customer.name,
      cus_email: input.customer.email,
      cus_phone: input.customer.phone,
      cus_add1: input.customer.address,
      cus_add2: input.customer.city,
      cus_city: input.customer.city,
      cus_country: 'Bangladesh',
      amount: this.providerAmount(input.amount),
      tran_id: input.merchantTransactionId,
      currency: input.currency,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      desc: `Ferio order ${input.orderReference}`,
      opt_a: input.orderReference,
      type: 'json',
    };
    const raw = await this.json(
      await fetch(`${this.baseUrl()}/jsonpost.php`, {
        method: 'POST',
        headers: correlationHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request),
      }),
    );
    const redirectUrl = this.text(raw.payment_url);
    if (this.text(raw.result) !== 'true' || !redirectUrl)
      throw new Error('aamarPay initiation failed');
    return { redirectUrl, raw };
  }

  async validate(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult> {
    const merchantTransactionId = this.text(
      payload.mer_txnid ??
        payload.tran_id ??
        payload.merchantTransactionId ??
        '',
    );
    const query = new URLSearchParams({
      request_id: merchantTransactionId,
      signature_key: this.signatureKey(),
      store_id: this.storeId(),
      type: 'json',
    });
    const raw = await this.json(
      await fetch(`${this.baseUrl()}/api/v1/trxcheck/request.php?${query}`, {
        headers: correlationHeaders(),
      }),
    );
    const status = this.text(raw.pay_status ?? raw.status).toLowerCase();
    return {
      outcome:
        status === 'successful' || status === 'success'
          ? 'SUCCEEDED'
          : status.includes('cancel')
            ? 'CANCELLED'
            : status.includes('fail') || status === 'invalid-data'
              ? 'FAILED'
              : 'PENDING',
      merchantTransactionId: this.text(
        raw.mer_txnid ?? raw.request_id ?? merchantTransactionId,
      ),
      // Trust only provider-reported values at this trust boundary; falling
      // back to callback payload would let callers influence amount/currency
      // comparisons. Missing provider values fail the equality check closed.
      amount: raw.amount !== undefined ? this.minorAmount(raw.amount) : undefined,
      currency: this.text(raw.currency ?? raw.currency_merchant),
      providerTransactionId: this.text(raw.pg_txnid ?? raw.bank_txn),
      raw,
    };
  }

  protected credentialKeys() {
    return ['AAMARPAY_STORE_ID', 'AAMARPAY_SIGNATURE_KEY'];
  }
  private storeId() {
    return this.value('AAMARPAY_STORE_ID');
  }
  private signatureKey() {
    return this.value('AAMARPAY_SIGNATURE_KEY');
  }
  private baseUrl() {
    return this.value('AAMARPAY_BASE_URL', 'https://sandbox.aamarpay.com');
  }
}
