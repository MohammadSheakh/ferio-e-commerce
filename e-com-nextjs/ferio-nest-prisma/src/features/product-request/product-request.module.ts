import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import {
  AdminProductRequestController,
  PublicProductRequestController,
} from './product-request.controller';
import { ProductRequestService } from './product-request.service';

@Module({
  imports: [TenancyModule, PrismaModule, AuthModule],
  controllers: [PublicProductRequestController, AdminProductRequestController],
  providers: [ProductRequestService],
  exports: [ProductRequestService],
})
export class ProductRequestModule {}
