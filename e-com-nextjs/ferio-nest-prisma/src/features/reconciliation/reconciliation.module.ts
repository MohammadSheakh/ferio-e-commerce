import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { ReconciliationProcessor } from './processors/reconciliation.processor';
import { ReconciliationQueue } from './queues/reconciliation.queue';
import { ReconciliationService } from './services/reconciliation.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [ReconciliationController],
  providers: [
    ReconciliationService,
    ReconciliationQueue,
    ReconciliationProcessor,
  ],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
