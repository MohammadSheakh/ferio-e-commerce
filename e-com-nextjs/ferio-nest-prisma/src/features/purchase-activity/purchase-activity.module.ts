import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminPurchaseActivityController,
  PurchaseActivityController,
} from './controllers/purchase-activity.controller';
import { PurchaseActivityService } from './services/purchase-activity.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule],
  controllers: [PurchaseActivityController, AdminPurchaseActivityController],
  providers: [PurchaseActivityService],
})
export class PurchaseActivityModule {}
