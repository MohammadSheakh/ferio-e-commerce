import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { StructuredLogger } from '@app/common';

export const RETENTION_SWEEP_JOB = 'run-retention-sweep';
export const RETENTION_SCHEDULER_ID = 'ferio-retention-sweep';

export type RetentionJobData = {
  initiatedByActorId?: string;
  organizationId?: string;
};

/**
 * Daily retention sweep scheduler — mirrors the reconciliation scan
 * pattern: an upserted repeatable job scheduler; registration is gated by
 * RETENTION_SWEEP_ENABLED so operators can disable the sweep without a
 * deploy.
 */
@Injectable()
export class RetentionQueue implements OnModuleInit {
  private readonly logger = new StructuredLogger(RetentionQueue.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RETENTION)
    private readonly queue: Queue<RetentionJobData>,
    @Optional() private readonly retention?: unknown,
  ) {}

  private scheduleEnabled(): boolean {
    return (process.env.RETENTION_SWEEP_ENABLED || 'true') === 'true';
  }

  private scheduleEveryHours(): number {
    const value = Number(process.env.RETENTION_SWEEP_EVERY_HOURS ?? 24);
    return Number.isFinite(value) && value >= 1 ? value : 24;
  }

  async onModuleInit() {
    if (!this.scheduleEnabled()) return;
    try {
      await this.queue.upsertJobScheduler(
        RETENTION_SCHEDULER_ID,
        { every: this.scheduleEveryHours() * 3_600_000 },
        { name: RETENTION_SWEEP_JOB, data: {} },
      );
      this.logger.log('retention_scheduler_registered', {
        schedulerId: RETENTION_SCHEDULER_ID,
        everyHours: this.scheduleEveryHours(),
      });
    } catch (error) {
      this.logger.error('retention_scheduler_registration_failed', error, {
        schedulerId: RETENTION_SCHEDULER_ID,
      });
    }
  }
}
