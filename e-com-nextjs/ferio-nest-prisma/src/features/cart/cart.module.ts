import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminCartEligibilityController,
  CartController,
} from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule],
  controllers: [CartController, AdminCartEligibilityController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
