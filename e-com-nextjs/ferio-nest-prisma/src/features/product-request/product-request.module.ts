import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { ProductRequestController } from './product-request.controller';
import { ProductRequestService } from './product-request.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProductRequestController],
  providers: [ProductRequestService],
  exports: [ProductRequestService],
})
export class ProductRequestModule {}
