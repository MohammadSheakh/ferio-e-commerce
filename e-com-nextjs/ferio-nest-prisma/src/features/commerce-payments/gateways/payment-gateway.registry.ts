import { BadRequestException, Injectable } from '@nestjs/common';
import type { CommercePaymentProvider } from '@prisma/client';
import { AamarpayGateway } from './aamarpay.gateway';
import { PaymentGateway } from './payment.gateway';
import { SslcommerzGateway } from './sslcommerz.gateway';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly gateways: Map<CommercePaymentProvider, PaymentGateway>;

  constructor(sslcommerz: SslcommerzGateway, aamarpay: AamarpayGateway) {
    this.gateways = new Map<CommercePaymentProvider, PaymentGateway>([
      [sslcommerz.provider, sslcommerz],
      [aamarpay.provider, aamarpay],
    ]);
  }

  get(provider: CommercePaymentProvider) {
    const gateway = this.gateways.get(provider);
    if (!gateway) throw new BadRequestException('Unknown payment provider');
    return gateway;
  }

  readiness() {
    return [...this.gateways.values()].map((gateway) => ({
      code: gateway.provider,
      name: gateway.displayName,
      configured: gateway.isConfigured(),
    }));
  }
}
