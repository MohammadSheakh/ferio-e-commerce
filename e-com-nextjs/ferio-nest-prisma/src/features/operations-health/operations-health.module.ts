import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { CommercePaymentsModule } from '../commerce-payments/commerce-payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OperationsHealthController } from './operations-health.controller';
import { OperationsHealthService } from './operations-health.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, CommercePaymentsModule, ShippingModule],
  controllers: [OperationsHealthController],
  providers: [OperationsHealthService],
})
export class OperationsHealthModule {}
