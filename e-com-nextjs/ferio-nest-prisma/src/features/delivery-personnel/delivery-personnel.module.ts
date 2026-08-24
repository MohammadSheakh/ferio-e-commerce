import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DeliveryPersonnelController } from './delivery-personnel.controller';
import { DeliveryPersonnelService } from './delivery-personnel.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [DeliveryPersonnelController],
  providers: [DeliveryPersonnelService],
  exports: [DeliveryPersonnelService],
})
export class DeliveryPersonnelModule {}
