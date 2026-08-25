import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { PathaoAdapter } from './adapters/pathao.adapter';
import { SteadfastAdapter } from './adapters/steadfast.adapter';
import { RedxAdapter } from './adapters/redx.adapter';
import { EcourierAdapter } from './adapters/ecourier.adapter';
import { PaperflyAdapter } from './adapters/paperfly.adapter';
import { CarrybeeAdapter } from './adapters/carrybee.adapter';
import { CourierRouterService } from './courier-router.service';
import {
  AdminShippingController,
  CourierWebhookController,
} from './shipping.controller';
import { ShippingService } from './shipping.service';
import { TransactionalMessagingModule } from '../transactional-messaging/transactional-messaging.module';
import { AuditModule } from '../audit/audit.module';
import { ShippingWebhookProcessor } from './shipping-webhook.processor';
import { ShippingWebhookQueue } from './shipping-webhook.queue';
import { ShippingPollingService } from './shipping-polling.service';
import { ShippingPollingQueue } from './shipping-polling.queue';
import { ShippingPollingProcessor } from './shipping-polling.processor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TransactionalMessagingModule,
    AuditModule,
    TenancyModule,
  ],
  controllers: [AdminShippingController, CourierWebhookController],
  providers: [
    ShippingService,
    CourierRouterService,
    ShippingWebhookQueue,
    ShippingWebhookProcessor,
    ShippingPollingService,
    ShippingPollingQueue,
    ShippingPollingProcessor,
    PathaoAdapter,
    SteadfastAdapter,
    RedxAdapter,
    EcourierAdapter,
    PaperflyAdapter,
    CarrybeeAdapter,
  ],
  exports: [ShippingService, CourierRouterService],
})
export class ShippingModule {}
