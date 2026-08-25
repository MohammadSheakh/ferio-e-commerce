import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { SettingsModule } from '../settings/settings.module';
import {
  PublicServiceController,
  AdminServiceController,
} from './service-booking.controller';
import { ServiceBookingService } from './service-booking.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, SettingsModule],
  controllers: [PublicServiceController, AdminServiceController],
  providers: [ServiceBookingService],
})
export class ServiceBookingModule {}
