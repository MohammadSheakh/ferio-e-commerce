import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { Optional } from '@nestjs/common';
import { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import {
  RECONCILIATION_SCAN_JOB,
  ReconciliationJobData,
} from '../queues/reconciliation.queue';
import { ReconciliationService } from '../services/reconciliation.service';

@Processor(QUEUE_NAMES.RECONCILIATION)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(ReconciliationProcessor.name);

  constructor(
    private readonly reconciliation: ReconciliationService,
    @Optional() private readonly fanout?: TenantFanoutService,
  ) {
    super();
  }

  async process(job: Job<ReconciliationJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      if (job.name !== RECONCILIATION_SCAN_JOB)
        throw new Error(`Unsupported reconciliation job: ${job.name}`);
      const queueJobId = String(job.id);
      this.logger.log('reconciliation_job_started', {
        jobId: queueJobId,
        jobName: job.name,
        retryRunId: job.data.retryRunId,
      });
      if (job.data.retryRunId) {
        const retryRunId = job.data.retryRunId;
        const runRetry = () =>
          this.reconciliation.retryRun(
            retryRunId,
            queueJobId,
            job.data.initiatedByActorId,
          );
        if (!job.data.organizationId) return runRetry();
        if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
        return this.fanout.forOrganization(job.data.organizationId, runRetry);
      }
      if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
        return this.reconciliation.runScheduled(
          job.data.overdueHours,
          queueJobId,
        );
      }
      // MT-8 §11.2: the scheduled scan fans out per READY tenant; per-org
      // failures are isolated and logged, never starving other tenants.
      if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
      const overdueHours = job.data.overdueHours;
      return this.fanout
        .forEachTenant(
          async () => {
            await this.reconciliation.runScheduled(overdueHours, queueJobId);
          },
          { label: 'reconciliation-scan' },
        )
        .then((outcome) => ({
          processedTenants: outcome.processed,
          tenantFailures: outcome.failures.length,
        }));
    });
  }
}
