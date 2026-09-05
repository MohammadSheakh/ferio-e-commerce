import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { RefundsController } from './controllers/refunds.controller';
import { RefundsService } from './services/refunds.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [RefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
