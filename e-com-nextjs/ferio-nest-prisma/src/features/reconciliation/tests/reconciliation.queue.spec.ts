import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import {
  ReconciliationQueue,
  type ReconciliationJobData,
} from '../queues/reconciliation.queue';
import type { ReconciliationService } from '../services/reconciliation.service';

describe('ReconciliationQueue', () => {
  const queue = {
    upsertJobScheduler: jest.fn(),
    getJobCounts: jest.fn(),
    getJobScheduler: jest.fn(),
    add: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      const values: Record<string, string> = {
        RECONCILIATION_SCHEDULE_ENABLED: 'true',
        RECONCILIATION_SCHEDULE_EVERY_MINUTES: '30',
        RECONCILIATION_OVERDUE_HOURS: '168',
      };
      return values[key] ?? fallback;
    }),
  };
  const reconciliation = {
    recentRuns: jest.fn(),
    operationsSummary: jest.fn(),
    getRetryableRun: jest.fn(),
  };
  const service = new ReconciliationQueue(
    queue as unknown as Queue<ReconciliationJobData>,
    config as unknown as ConfigService,
    reconciliation as unknown as ReconciliationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queue.upsertJobScheduler.mockResolvedValue({});
    reconciliation.recentRuns.mockResolvedValue([]);
    reconciliation.operationsSummary.mockResolvedValue({
      completedCount: 0,
      failedCount: 0,
    });
  });

  it('registers the configured BullMQ scheduler', async () => {
    await service.onModuleInit();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'ferio-reconciliation-scan',
      { every: 1_800_000 },
      {
        name: 'run-reconciliation-scan',
        data: { overdueHours: 168 },
      },
    );
  });

  it('returns Redis counts with durable PostgreSQL runs', async () => {
    queue.getJobCounts.mockResolvedValue({ waiting: 1, active: 0 });
    queue.getJobScheduler.mockResolvedValue({
      name: 'run-reconciliation-scan',
      next: 1_786_474_800_000,
    });
    reconciliation.recentRuns.mockResolvedValue([{ id: 'run-1' }]);
    reconciliation.operationsSummary.mockResolvedValue({
      completedCount: 3,
      failedCount: 1,
    });

    await expect(service.health()).resolves.toEqual(
      expect.objectContaining({
        available: true,
        counts: { waiting: 1, active: 0 },
        operations: { completedCount: 3, failedCount: 1 },
        recentRuns: [{ id: 'run-1' }],
      }),
    );
  });

  it('queues retries only after validating the failed run', async () => {
    reconciliation.getRetryableRun.mockResolvedValue({
      id: 'run-failed',
      overdueHours: 72,
      attemptCount: 1,
    });
    queue.add.mockResolvedValue({ id: 'job-1' });

    await expect(
      service.enqueueRetry('run-failed', 'admin-1'),
    ).resolves.toEqual({
      runId: 'run-failed',
      jobId: 'job-1',
      status: 'QUEUED',
    });
    expect(queue.add).toHaveBeenCalledWith(
      'run-reconciliation-scan',
      {
        overdueHours: 72,
        retryRunId: 'run-failed',
        initiatedByActorId: 'admin-1',
      },
      { jobId: 'reconciliation-retry-run-failed-1' },
    );
  });
});
