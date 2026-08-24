import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { OrderModule } from '../order/order.module';
import { AuditModule } from '../audit/audit.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AamarpayGateway } from './gateways/aamarpay.gateway';
import { PaymentGatewayRegistry } from './gateways/payment-gateway.registry';
import { SslcommerzGateway } from './gateways/sslcommerz.gateway';
import {
  AdminCommercePaymentsController,
  PublicCommercePaymentsController,
} from './commerce-payments.controller';
import { CommercePaymentsService } from './commerce-payments.service';
import { PaymentRecoveryProcessor } from './payment-recovery.processor';
import { PaymentRecoveryQueue } from './payment-recovery.queue';

@Module({
  imports: [PrismaModule, AuthModule, OrderModule, AuditModule, TenancyModule],
  controllers: [
    PublicCommercePaymentsController,
    AdminCommercePaymentsController,
  ],
  providers: [
    CommercePaymentsService,
    PaymentGatewayRegistry,
    SslcommerzGateway,
    AamarpayGateway,
    PaymentRecoveryQueue,
    PaymentRecoveryProcessor,
  ],
  exports: [PaymentGatewayRegistry],
})
export class CommercePaymentsModule {}
