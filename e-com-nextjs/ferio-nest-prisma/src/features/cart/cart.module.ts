import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminCartEligibilityController,
  CartController,
} from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartController, AdminCartEligibilityController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
