import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { Optional } from '@nestjs/common';
import { TenantFanoutService } from '../../tenancy/tenant-fanout.service';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import { ShippingPollingService } from './shipping-polling.service';
import {
  COURIER_POLL_JOB,
  COURIER_POLL_SWEEP_JOB,
  CourierPollJobData,
  ShippingPollingQueue,
} from './shipping-polling.queue';

@Processor(QUEUE_NAMES.COURIER_POLL)
export class ShippingPollingProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(ShippingPollingProcessor.name);

  constructor(
    private readonly polling: ShippingPollingService,
    private readonly pollingQueue: ShippingPollingQueue,
    @Optional() private readonly fanout?: TenantFanoutService,
  ) {
    super();
  }

  async process(job: Job<CourierPollJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      this.logger.log('courier_polling_job_started', {
        jobId: String(job.id),
        jobName: job.name,
        pollAttemptId: job.data.pollAttemptId,
      });
      if (job.name === COURIER_POLL_SWEEP_JOB) {
        return this.pollingQueue.enqueueDue();
      }
      if (job.name !== COURIER_POLL_JOB || !job.data.pollAttemptId) {
        throw new Error(`Unsupported courier polling job: ${job.name}`);
      }
      const organizationId = (job.data as { organizationId?: string }).organizationId;
      if (!organizationId) return this.polling.execute(job.data.pollAttemptId);
      const pollAttemptId = job.data.pollAttemptId as string;
      return this.fanout!.forOrganization(organizationId, () =>
        this.polling.execute(pollAttemptId),
      );
    });
  }
}
