import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { CartModule } from '../cart/cart.module';
import {
  AdminDeliveryController,
  PublicCheckoutController,
} from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, CartModule, AuditModule],
  controllers: [PublicCheckoutController, AdminDeliveryController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
