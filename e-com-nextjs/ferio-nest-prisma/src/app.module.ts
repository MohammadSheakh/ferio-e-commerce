import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { RedisModule } from '@app/redis';
import { AuthModule } from './features/authentication/auth.module';
import { UserModule } from './features/user-management/user.module';
import { PrismaModule } from '@app/database';
import { BullMQModule } from '@app/queue';
import { SettingsModule } from './features/settings/settings.module';
import { CatalogModule } from './features/catalog/catalog.module';
import { CartModule } from './features/cart/cart.module';
import { CheckoutModule } from './features/checkout/checkout.module';
import { OrderModule } from './features/order/order.module';
import { ShippingModule } from './features/shipping/shipping.module';
import { TransactionalMessagingModule } from './features/transactional-messaging/transactional-messaging.module';
import { AuditModule } from './features/audit/audit.module';
import { ReportsModule } from './features/reports/reports.module';
import { ReturnsModule } from './features/returns/returns.module';
import { RefundsModule } from './features/refunds/refunds.module';
import { RtoModule } from './features/rto/rto.module';
import { SettlementsModule } from './features/settlements/settlements.module';
import { ReconciliationModule } from './features/reconciliation/reconciliation.module';
import { CommercePaymentsModule } from './features/commerce-payments/commerce-payments.module';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PlatformModule } from './platform/platform.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantContextMiddleware } from './tenancy/tenant-resolver.service';
import { ProductContentModule } from './features/product-content/product-content.module';
import { ServiceBookingModule } from './features/service-booking/service-booking.module';
import { WarrantyModule } from './features/warranty/warranty.module';
import { PurchaseActivityModule } from './features/purchase-activity/purchase-activity.module';
import { CustomersModule } from './features/customers/customers.module';
import { CustomerAccountModule } from './features/customer-account/customer-account.module';
import { SocketModule } from './features/socket.gateway/socket.module';
import { ChattingModule } from './features/chatting/chatting.module';
import { ProductRequestModule } from './features/product-request/product-request.module';
import { StoreLocationsModule } from './features/store-locations/store-locations.module';
import { DeliveryPersonnelModule } from './features/delivery-personnel/delivery-personnel.module';
import { StaffAccessModule } from './features/staff-access/staff-access.module';
import { StorefrontAnalyticsModule } from './features/storefront-analytics/storefront-analytics.module';
import { OperationsHealthModule } from './features/operations-health/operations-health.module';
import { CustomerNotificationsModule } from './features/customer-notifications/customer-notifications.module';
import { WalletModule } from './features/wallet/wallet.module';

/**
 * Application Root Module
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    PlatformModule,
    TenancyModule,
    BullMQModule,
    SocketModule,
    ChattingModule,
    ProductRequestModule,

    AuthModule,
    UserModule,
    SettingsModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    OrderModule,
    ShippingModule,
    StoreLocationsModule,
    DeliveryPersonnelModule,
    TransactionalMessagingModule,
    AuditModule,
    ReportsModule,
    ReturnsModule,
    RefundsModule,
    RtoModule,
    SettlementsModule,
    ReconciliationModule,
    CommercePaymentsModule,
    ProductContentModule,
    ServiceBookingModule,
    WarrantyModule,
    PurchaseActivityModule,
    CustomersModule,
    CustomerAccountModule,
    StaffAccessModule,
    StorefrontAnalyticsModule,
    OperationsHealthModule,
    CustomerNotificationsModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        'api/v1/platform/(.*)',
        'platform/(.*)',
        'health',
        'api/v1/health',
        'socket.io/(.*)',
      )
      .forRoutes('*');
  }
}
