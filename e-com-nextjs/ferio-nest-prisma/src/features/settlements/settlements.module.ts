import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SettlementsController } from './settlements.controller';
import { SettlementImportsService } from './settlement-imports.service';
import { SettlementReportParserService } from './settlement-report-parser.service';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [SettlementsController],
  providers: [
    SettlementsService,
    SettlementImportsService,
    SettlementReportParserService,
  ],
})
export class SettlementsModule {}
