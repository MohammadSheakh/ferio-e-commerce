import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminPurchaseActivityController,
  PurchaseActivityController,
} from './purchase-activity.controller';
import { PurchaseActivityService } from './purchase-activity.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PurchaseActivityController, AdminPurchaseActivityController],
  providers: [PurchaseActivityService],
})
export class PurchaseActivityModule {}
