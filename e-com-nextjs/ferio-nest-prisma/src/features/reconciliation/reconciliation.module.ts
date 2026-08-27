import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationProcessor } from './reconciliation.processor';
import { ReconciliationQueue } from './reconciliation.queue';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [ReconciliationController],
  providers: [
    ReconciliationService,
    ReconciliationQueue,
    ReconciliationProcessor,
  ],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
