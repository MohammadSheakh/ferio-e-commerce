import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { StoreLocationsService } from './store-locations.service';
import {
  AdminStoreLocationsController,
  PublicStoreLocationsController,
} from './store-locations.controller';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [PublicStoreLocationsController, AdminStoreLocationsController],
  providers: [StoreLocationsService],
  exports: [StoreLocationsService],
})
export class StoreLocationsModule {}


