import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SettlementsController } from './settlements.controller';
import { SettlementImportsService } from './settlement-imports.service';
import { SettlementReportParserService } from './settlement-report-parser.service';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, TenancyModule],
  controllers: [SettlementsController],
  providers: [
    SettlementsService,
    SettlementImportsService,
    SettlementReportParserService,
  ],
})
export class SettlementsModule {}
