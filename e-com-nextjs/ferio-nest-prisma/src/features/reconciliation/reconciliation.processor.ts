import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import {
  RECONCILIATION_SCAN_JOB,
  ReconciliationJobData,
} from './reconciliation.queue';
import { ReconciliationService } from './reconciliation.service';

@Processor(QUEUE_NAMES.RECONCILIATION)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(ReconciliationProcessor.name);

  constructor(private readonly reconciliation: ReconciliationService) {
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
        return this.reconciliation.retryRun(
          job.data.retryRunId,
          queueJobId,
          job.data.initiatedByActorId,
        );
      }
      return this.reconciliation.runScheduled(
        job.data.overdueHours,
        queueJobId,
      );
    });
  }
}
