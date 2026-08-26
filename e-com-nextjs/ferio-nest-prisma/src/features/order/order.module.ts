import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { CartModule } from '../cart/cart.module';
import {
  AdminOrderController,
  PublicOrderController,
  PublicOrderTrackingController,
} from './order.controller';
import { OrderService } from './order.service';
import { TransactionalMessagingModule } from '../transactional-messaging/transactional-messaging.module';
import { AuditModule } from '../audit/audit.module';
import { CustomerNotificationsModule } from '../customer-notifications/customer-notifications.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ TenancyModule,
    PrismaModule,
    AuthModule,
    CartModule,
    TransactionalMessagingModule,
    AuditModule,
    CustomerNotificationsModule,
    WalletModule,
  ],
  controllers: [
    PublicOrderController,
    PublicOrderTrackingController,
    AdminOrderController,
  ],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
