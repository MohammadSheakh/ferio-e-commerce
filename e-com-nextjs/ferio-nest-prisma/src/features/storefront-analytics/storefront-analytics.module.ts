import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { StorefrontAnalyticsController } from './storefront-analytics.controller';
import { StorefrontAnalyticsService } from './storefront-analytics.service';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../authentication/auth.module';
import { TenancyModule } from '../../tenancy/tenancy.module';

@Module({
  imports: [PrismaModule, TenancyModule, SettingsModule, AuthModule],
  controllers: [StorefrontAnalyticsController],
  providers: [StorefrontAnalyticsService],
})
export class StorefrontAnalyticsModule {}
