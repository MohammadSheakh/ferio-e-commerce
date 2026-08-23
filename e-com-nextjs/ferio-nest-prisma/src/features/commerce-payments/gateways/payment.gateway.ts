import { ConfigService } from '@nestjs/config';
import type { CommercePaymentProvider } from '@prisma/client';

export type PaymentCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

export type InitiatePaymentInput = {
  merchantTransactionId: string;
  amount: number;
  currency: string;
  orderReference: string;
  customer: PaymentCustomer;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type InitiatePaymentResult = {
  redirectUrl: string;
  providerSessionId?: string;
  raw: unknown;
};

export type ValidatePaymentResult = {
  outcome: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PENDING' | 'UNKNOWN';
  merchantTransactionId: string;
  amount?: number;
  currency?: string;
  providerTransactionId?: string;
  validationId?: string;
  riskLevel?: string;
  raw: unknown;
};

export abstract class PaymentGateway {
  abstract readonly provider: CommercePaymentProvider;
  abstract readonly displayName: string;

  protected constructor(protected readonly config: ConfigService) {}

  abstract initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult>;
  abstract validate(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult>;
  protected abstract credentialKeys(): string[];

  isConfigured() {
    return this.credentialKeys().every((key) => Boolean(this.value(key)));
  }

  protected value(key: string, fallback = '') {
    return this.config.get<string>(key, fallback);
  }

  protected providerAmount(minorAmount: number) {
    return (minorAmount / 100).toFixed(2);
  }

  protected minorAmount(value: unknown) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
  }

  protected async json(response: Response) {
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok)
      throw new Error(`Payment provider returned HTTP ${response.status}`);
    return body;
  }
}
