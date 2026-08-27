import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import {
  AdminCommerceSettingsController,
  PublicCommerceSettingsController,
} from './controllers/commerce-settings.controller';
import { CommerceSettingsService } from './services/commerce-settings.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [
    SettingsController,
    PublicCommerceSettingsController,
    AdminCommerceSettingsController,
  ],
  providers: [SettingsService, CommerceSettingsService],
  exports: [SettingsService, CommerceSettingsService],
})
export class SettingsModule {}
