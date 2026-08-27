import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { StructuredLogger, type UserPayload } from '@app/common';
import { QUEUE_NAMES } from '@app/queue';
import { AuditService } from '../audit/audit.service';
import { CommercePaymentsService } from './commerce-payments.service';

export const PAYMENT_EXPIRY_JOB = 'expire-prepaid-attempt';
export const PAYMENT_EXPIRY_SWEEP_JOB = 'sweep-expired-prepaid-attempts';
export const PAYMENT_RECOVERY_SCHEDULER_ID = 'ferio-payment-expiry-recovery';
export type PaymentRecoveryJobData = { attemptId?: string };

@Injectable()
export class PaymentRecoveryQueue implements OnModuleInit {
  private readonly logger = new StructuredLogger(PaymentRecoveryQueue.name);
  constructor(
    @InjectQueue(QUEUE_NAMES.PAYMENT_RECOVERY)
    private readonly queue: Queue<PaymentRecoveryJobData>,
    private readonly config: ConfigService,
    private readonly payments: CommercePaymentsService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    if (!this.enabled()) return;
    try {
      await this.queue.upsertJobScheduler(
        PAYMENT_RECOVERY_SCHEDULER_ID,
        { every: this.everyMinutes() * 60_000 },
        { name: PAYMENT_EXPIRY_SWEEP_JOB, data: {} },
      );
      this.logger.log('payment_recovery_scheduler_registered', {
        schedulerId: PAYMENT_RECOVERY_SCHEDULER_ID,
        everyMinutes: this.everyMinutes(),
        batchSize: this.batchSize(),
      });
    } catch (error) {
      this.logger.error(
        'payment_recovery_scheduler_registration_failed',
        error,
        { schedulerId: PAYMENT_RECOVERY_SCHEDULER_ID },
      );
    }
  }

  async enqueueDue() {
    const attempts = await this.payments.eligibleExpiredAttempts(
      this.batchSize(),
    );
    const jobs = await this.queue.addBulk(
      attempts.map((attempt) => ({
        name: PAYMENT_EXPIRY_JOB,
        data: { attemptId: attempt.id },
        opts: { jobId: `payment-expiry-${attempt.id}` },
      })),
    );
    return { queuedCount: jobs.length };
  }

  async enqueueSweep(actor: UserPayload) {
    const job = await this.queue.add(
      PAYMENT_EXPIRY_SWEEP_JOB,
      {},
      { jobId: `payment-expiry-sweep-${Date.now()}` },
    );
    await this.audit.record({
      action: 'PAYMENT_EXPIRY_SWEEP_QUEUED',
      entityType: 'CommercePaymentAttempt',
      entityId: 'expired-due',
      actor,
      newValue: { jobId: String(job.id) },
    });
    return { jobId: String(job.id), status: 'QUEUED' as const };
  }

  async health() {
    const eligible = await this.payments.eligibleExpiredAttempts(
      this.batchSize(),
    );
    try {
      const [counts, scheduler] = await Promise.all([
        this.queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        ),
        this.queue.getJobScheduler(PAYMENT_RECOVERY_SCHEDULER_ID),
      ]);
      return {
        available: true,
        enabled: this.enabled(),
        everyMinutes: this.everyMinutes(),
        batchSize: this.batchSize(),
        eligibleCount: eligible.length,
        counts,
        scheduler: scheduler
          ? { id: scheduler.id, name: scheduler.name, next: scheduler.next }
          : null,
      };
    } catch (error) {
      return {
        available: false,
        enabled: this.enabled(),
        everyMinutes: this.everyMinutes(),
        batchSize: this.batchSize(),
        eligibleCount: eligible.length,
        error: error instanceof Error ? error.message : 'Queue unavailable',
      };
    }
  }

  private enabled() {
    return (
      this.config.get<string>('PAYMENT_RECOVERY_ENABLED', 'false') === 'true'
    );
  }
  private everyMinutes() {
    return Number(
      this.config.get<string>('PAYMENT_RECOVERY_EVERY_MINUTES', '5'),
    );
  }
  private batchSize() {
    return Number(
      this.config.get<string>('PAYMENT_RECOVERY_BATCH_SIZE', '100'),
    );
  }
}
