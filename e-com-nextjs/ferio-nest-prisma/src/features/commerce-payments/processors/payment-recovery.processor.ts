import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { Optional } from '@nestjs/common';
import { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { runWithCorrelationId, StructuredLogger } from '@app/common';
import { CommercePaymentsService } from '../services/commerce-payments.service';
import {
  PAYMENT_EXPIRY_JOB,
  PAYMENT_EXPIRY_SWEEP_JOB,
  PaymentRecoveryJobData,
  PaymentRecoveryQueue,
} from '../queues/payment-recovery.queue';

@Processor(QUEUE_NAMES.PAYMENT_RECOVERY)
export class PaymentRecoveryProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(PaymentRecoveryProcessor.name);

  constructor(
    private readonly payments: CommercePaymentsService,
    private readonly recovery: PaymentRecoveryQueue,
      @Optional() private readonly fanout?: TenantFanoutService,
  ) {
    super();
  }
  process(job: Job<PaymentRecoveryJobData>) {
    return runWithCorrelationId(`queue:${job.name}:${String(job.id)}`, () => {
      this.logger.log('payment_recovery_job_started', {
        jobId: String(job.id),
        jobName: job.name,
        attemptId: job.data.attemptId,
      });
      if (job.name === PAYMENT_EXPIRY_SWEEP_JOB)
        return this.recovery.enqueueDue();
      if (job.name !== PAYMENT_EXPIRY_JOB || !job.data.attemptId)
        throw new Error(`Unsupported payment recovery job: ${job.name}`);
      const organizationId = (
        job.data as { organizationId?: string }
      ).organizationId;
      if (!organizationId) {
        return this.payments.expireAttempt(job.data.attemptId as string);
      }
      return this.fanout!.forOrganization(organizationId, () =>
        this.payments.expireAttempt(job.data.attemptId as string),
      );
    });
  }
}
