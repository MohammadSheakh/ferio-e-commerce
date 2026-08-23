import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { StructuredLogger } from '@app/common';
import { ReconciliationService } from './reconciliation.service';

export const RECONCILIATION_SCAN_JOB = 'run-reconciliation-scan';
export const RECONCILIATION_SCHEDULER_ID = 'ferio-reconciliation-scan';

export type ReconciliationJobData = {
  overdueHours: number;
  retryRunId?: string;
  initiatedByActorId?: string;
};

@Injectable()
export class ReconciliationQueue implements OnModuleInit {
  private readonly logger = new StructuredLogger(ReconciliationQueue.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RECONCILIATION)
    private readonly queue: Queue<ReconciliationJobData>,
    private readonly config: ConfigService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  async onModuleInit() {
    if (!this.scheduleEnabled()) return;
    try {
      await this.queue.upsertJobScheduler(
        RECONCILIATION_SCHEDULER_ID,
        { every: this.scheduleEveryMinutes() * 60_000 },
        {
          name: RECONCILIATION_SCAN_JOB,
          data: { overdueHours: this.overdueHours() },
        },
      );
      this.logger.log('reconciliation_scheduler_registered', {
        schedulerId: RECONCILIATION_SCHEDULER_ID,
        everyMinutes: this.scheduleEveryMinutes(),
        overdueHours: this.overdueHours(),
      });
    } catch (error) {
      this.logger.error('reconciliation_scheduler_registration_failed', error, {
        schedulerId: RECONCILIATION_SCHEDULER_ID,
      });
    }
  }

  async health() {
    const [recentRuns, operations] = await Promise.all([
      this.reconciliation.recentRuns(10),
      this.reconciliation.operationsSummary(),
    ]);
    try {
      const [counts, scheduler] = await Promise.all([
        this.queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        ),
        this.queue.getJobScheduler(RECONCILIATION_SCHEDULER_ID),
      ]);
      return {
        available: true,
        scheduleEnabled: this.scheduleEnabled(),
        scheduleEveryMinutes: this.scheduleEveryMinutes(),
        overdueHours: this.overdueHours(),
        counts,
        scheduler: scheduler
          ? {
              id: RECONCILIATION_SCHEDULER_ID,
              name: scheduler.name,
              next: scheduler.next,
            }
          : null,
        operations,
        recentRuns,
      };
    } catch (error) {
      return {
        available: false,
        scheduleEnabled: this.scheduleEnabled(),
        scheduleEveryMinutes: this.scheduleEveryMinutes(),
        overdueHours: this.overdueHours(),
        counts: null,
        scheduler: null,
        operations,
        recentRuns,
        error: error instanceof Error ? error.message : 'Queue unavailable',
      };
    }
  }

  async enqueueRetry(runId: string, initiatedByActorId: string) {
    const run = await this.reconciliation.getRetryableRun(runId);
    const job = await this.queue.add(
      RECONCILIATION_SCAN_JOB,
      {
        overdueHours: run.overdueHours,
        retryRunId: run.id,
        initiatedByActorId,
      },
      { jobId: `reconciliation-retry-${run.id}-${run.attemptCount}` },
    );
    return { runId: run.id, jobId: String(job.id), status: 'QUEUED' as const };
  }

  private scheduleEnabled() {
    return (
      this.config.get<string>('RECONCILIATION_SCHEDULE_ENABLED', 'false') ===
      'true'
    );
  }

  private scheduleEveryMinutes() {
    return Number(
      this.config.get<string>('RECONCILIATION_SCHEDULE_EVERY_MINUTES', '60'),
    );
  }

  private overdueHours() {
    return Number(
      this.config.get<string>('RECONCILIATION_OVERDUE_HOURS', '168'),
    );
  }
}
