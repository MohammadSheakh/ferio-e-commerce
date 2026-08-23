import type { Job } from 'bullmq';
import { ReconciliationProcessor } from './reconciliation.processor';
import {
  RECONCILIATION_SCAN_JOB,
  ReconciliationJobData,
} from './reconciliation.queue';
import type { ReconciliationService } from './reconciliation.service';

describe('ReconciliationProcessor', () => {
  const reconciliation = {
    runScheduled: jest.fn(),
    retryRun: jest.fn(),
  };
  const processor = new ReconciliationProcessor(
    reconciliation as unknown as ReconciliationService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('routes scheduled jobs to a system scan', async () => {
    reconciliation.runScheduled.mockResolvedValue({ status: 'COMPLETED' });
    const job = {
      id: 'scheduler-job-1',
      name: RECONCILIATION_SCAN_JOB,
      data: { overdueHours: 168 },
    } as Job<ReconciliationJobData>;

    await processor.process(job);

    expect(reconciliation.runScheduled).toHaveBeenCalledWith(
      168,
      'scheduler-job-1',
    );
  });

  it('routes retry jobs to the original durable run', async () => {
    reconciliation.retryRun.mockResolvedValue({ status: 'COMPLETED' });
    const job = {
      id: 'retry-job-1',
      name: RECONCILIATION_SCAN_JOB,
      data: {
        overdueHours: 168,
        retryRunId: 'run-failed',
        initiatedByActorId: 'admin-1',
      },
    } as Job<ReconciliationJobData>;

    await processor.process(job);

    expect(reconciliation.retryRun).toHaveBeenCalledWith(
      'run-failed',
      'retry-job-1',
      'admin-1',
    );
  });
});
