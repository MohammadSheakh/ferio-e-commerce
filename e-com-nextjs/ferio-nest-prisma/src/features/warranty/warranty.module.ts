import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import {
  WarrantyController,
  AdminWarrantyController,
} from './warranty.controller';
import { WarrantyService } from './warranty.service';

@Module({
  imports: [
    TenancyModule,
    PrismaModule,
    AuthModule,
    SettingsModule,
    StorageModule,
  ],
  controllers: [WarrantyController, AdminWarrantyController],
  providers: [WarrantyService],
})
export class WarrantyModule {}
