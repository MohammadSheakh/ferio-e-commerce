import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { CloudinaryStrategy } from '../attachments/strategies/cloudinary.strategy';
import {
  WarrantyController,
  AdminWarrantyController,
} from './warranty.controller';
import { WarrantyService } from './warranty.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, SettingsModule],
  controllers: [WarrantyController, AdminWarrantyController],
  providers: [WarrantyService, CloudinaryStrategy],
})
export class WarrantyModule {}
