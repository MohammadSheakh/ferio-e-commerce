import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import { ShippingService } from './shipping.service';
import {
  COURIER_CALLBACK_RETRY_JOB,
  COURIER_CALLBACK_SWEEP_JOB,
  CourierCallbackJobData,
  ShippingWebhookQueue,
} from './shipping-webhook.queue';

@Processor(QUEUE_NAMES.COURIER_CALLBACK)
export class ShippingWebhookProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(ShippingWebhookProcessor.name);

  constructor(
    private readonly shipping: ShippingService,
    private readonly callbackQueue: ShippingWebhookQueue,
  ) {
    super();
  }

  async process(job: Job<CourierCallbackJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      this.logger.log('courier_callback_job_started', {
        jobId: String(job.id),
        jobName: job.name,
        callbackLogId: job.data.callbackLogId,
      });
      if (job.name === COURIER_CALLBACK_SWEEP_JOB) {
        return this.callbackQueue.enqueueRecoverable();
      }
      if (job.name !== COURIER_CALLBACK_RETRY_JOB || !job.data.callbackLogId) {
        throw new Error(`Unsupported courier callback job: ${job.name}`);
      }
      return this.shipping.retryWebhookLog(job.data.callbackLogId);
    });
  }
}
