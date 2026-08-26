import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import { Optional } from '@nestjs/common';
import {
  RETENTION_SWEEP_JOB,
  type RetentionJobData,
} from './retention.queue';
import { RetentionSweepService } from './retention-sweep.service';

@Processor(QUEUE_NAMES.RETENTION)
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(RetentionProcessor.name);

  constructor(
    private readonly retention: RetentionSweepService,
    @Optional() private readonly fanout?: unknown,
  ) {
    super();
  }

  async process(job: Job<RetentionJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      if (job.name !== RETENTION_SWEEP_JOB)
        throw new Error(`Unsupported retention job: ${job.name}`);
      this.logger.log('retention_job_started', { jobId: String(job.id) });

      if (job.data.organizationId) {
        // Single-tenant retry path (platform-triggered repair).
        return this.retention.sweepTenant(job.data.organizationId);
      }
      return this.retention.sweepAllReady();
    });
  }
}
