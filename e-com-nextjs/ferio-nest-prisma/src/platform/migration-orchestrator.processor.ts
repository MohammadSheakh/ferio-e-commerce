import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { runWithCorrelationId } from '@app/common';
import {
  MigrationOrchestratorService,
  TENANT_MIGRATION_RUN_JOB,
  type TenantMigrationJobData,
} from './services/migration-orchestrator.service';

/**
 * Executes migration runs off the HTTP path (ADR-0005 §14.3: never run
 * uncontrolled migrations from application startup — this processor only
 * ever runs when an operator starts a run through the control plane).
 */
@Processor(QUEUE_NAMES.TENANT_MIGRATION)
@Injectable()
export class TenantMigrationProcessor extends WorkerHost {
  constructor(private readonly orchestrator: MigrationOrchestratorService) {
    super();
  }

  process(job: Job<TenantMigrationJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      if (job.name !== TENANT_MIGRATION_RUN_JOB || !job.data.migrationRunId) {
        throw new Error(`Unsupported tenant migration job: ${job.name}`);
      }
      return this.orchestrator.processRun(job.data.migrationRunId);
    });
  }
}
