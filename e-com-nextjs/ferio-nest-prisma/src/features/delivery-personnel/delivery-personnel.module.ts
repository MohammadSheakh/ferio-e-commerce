import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DeliveryPersonnelController } from './delivery-personnel.controller';
import { DeliveryPersonnelService } from './delivery-personnel.service';
import { TenancyModule } from '../../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule, PrismaModule, AuthModule, AuditModule],
  controllers: [DeliveryPersonnelController],
  providers: [DeliveryPersonnelService],
  exports: [DeliveryPersonnelService],
})
export class DeliveryPersonnelModule {}
