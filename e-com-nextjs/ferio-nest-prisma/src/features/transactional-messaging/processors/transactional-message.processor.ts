import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { Optional } from '@nestjs/common';
import { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { runWithCorrelationId } from '@app/common';
import { TransactionalMessageDispatcher } from '../services/transactional-message-dispatcher';
import {
  TRANSACTIONAL_MESSAGE_JOB,
  TRANSACTIONAL_MESSAGE_SWEEP_JOB,
  TransactionalMessageJobData,
  TransactionalMessageQueue,
} from '../queues/transactional-message.queue';

@Processor(QUEUE_NAMES.TRANSACTIONAL_MESSAGE)
export class TransactionalMessageProcessor extends WorkerHost {
  constructor(
    private readonly dispatcher: TransactionalMessageDispatcher,
    private readonly queue: TransactionalMessageQueue,
      @Optional() private readonly fanout?: TenantFanoutService,
  ) {
    super();
  }

  process(job: Job<TransactionalMessageJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      if (job.name === TRANSACTIONAL_MESSAGE_SWEEP_JOB)
        return this.queue.enqueueDue();
      if (job.name !== TRANSACTIONAL_MESSAGE_JOB || !job.data.messageId) {
        throw new Error(`Unsupported transactional message job: ${job.name}`);
      }
      const organizationId = (job.data as { organizationId?: string }).organizationId;
      const messageId = job.data.messageId as string;
      if (!organizationId) {
        if ((process.env.TENANCY_ENABLED || 'false') === 'true') {
          throw new Error('TRANSACTIONAL_MESSAGE_ORGANIZATION_REQUIRED');
        }
        return this.dispatcher.execute(messageId);
      }
      if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
      return this.fanout.forOrganization(organizationId, () =>
        this.dispatcher.execute(messageId),
      );
    });
  }
}
