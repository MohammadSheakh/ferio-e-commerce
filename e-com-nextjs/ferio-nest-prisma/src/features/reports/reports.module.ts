import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
