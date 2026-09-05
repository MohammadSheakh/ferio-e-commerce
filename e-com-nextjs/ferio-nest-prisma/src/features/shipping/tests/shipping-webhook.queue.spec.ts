import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/audit.service';
import {
  COURIER_CALLBACK_RETRY_JOB,
  COURIER_CALLBACK_SCHEDULER_ID,
  COURIER_CALLBACK_SWEEP_JOB,
  ShippingWebhookQueue,
} from '../queues/shipping-webhook.queue';

describe('ShippingWebhookQueue', () => {
  const queue = {
    upsertJobScheduler: jest.fn(),
    getJobCounts: jest.fn(),
    getJobScheduler: jest.fn(),
    addBulk: jest.fn(),
    add: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      const values: Record<string, string> = {
        COURIER_CALLBACK_RETRY_ENABLED: 'true',
        COURIER_CALLBACK_RETRY_EVERY_MINUTES: '5',
        COURIER_CALLBACK_RETRY_MAX_ATTEMPTS: '6',
      };
      return values[key] ?? fallback;
    }),
  };
  const prisma = {
    shipmentWebhookLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const audit = { record: jest.fn() };
  const service = new ShippingWebhookQueue(
    queue as unknown as Queue,
    config as unknown as ConfigService,
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queue.getJobCounts.mockResolvedValue({
      waiting: 1,
      active: 0,
      completed: 2,
      failed: 0,
      delayed: 1,
    });
    queue.getJobScheduler.mockResolvedValue({
      name: COURIER_CALLBACK_SWEEP_JOB,
      next: Date.now() + 60_000,
    });
    queue.add.mockResolvedValue({ id: 'courier-callback-retry-log-1-2' });
    queue.addBulk.mockResolvedValue([]);
    prisma.shipmentWebhookLog.count.mockResolvedValue(2);
    prisma.shipmentWebhookLog.findMany.mockResolvedValue([
      { id: 'log-1', attemptCount: 1 },
      { id: 'log-2', attemptCount: 2 },
    ]);
    prisma.shipmentWebhookLog.findUnique.mockResolvedValue({
      id: 'log-1',
      authValid: true,
      processed: false,
      attemptCount: 1,
    });
    audit.record.mockResolvedValue({});
  });

  it('registers the configured retry sweep scheduler', async () => {
    await service.onModuleInit();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      COURIER_CALLBACK_SCHEDULER_ID,
      { every: 300_000 },
      { name: COURIER_CALLBACK_SWEEP_JOB, data: {} },
    );
  });

  it('reports queue counts, scheduler timing, and recoverable evidence', async () => {
    await expect(service.health()).resolves.toEqual(
      expect.objectContaining({
        available: true,
        scheduleEnabled: true,
        scheduleEveryMinutes: 5,
        maxAttempts: 6,
        recoverableCount: 2,
        scheduler: expect.objectContaining({
          id: COURIER_CALLBACK_SCHEDULER_ID,
          name: COURIER_CALLBACK_SWEEP_JOB,
        }),
      }),
    );
  });

  it('enqueues recoverable callbacks with deterministic attempt IDs', async () => {
    await expect(service.enqueueRecoverable()).resolves.toEqual({
      queuedCount: 2,
    });
    expect(queue.addBulk).toHaveBeenCalledWith([
      {
        name: COURIER_CALLBACK_RETRY_JOB,
        data: { callbackLogId: 'log-1' },
        opts: { jobId: 'courier-callback-retry-log-1-2' },
      },
      {
        name: COURIER_CALLBACK_RETRY_JOB,
        data: { callbackLogId: 'log-2' },
        opts: { jobId: 'courier-callback-retry-log-2-3' },
      },
    ]);
  });

  it('queues and audits an operator retry', async () => {
    const actor = { userId: 'admin-1', role: 'admin', email: 'admin@ferio.local' } as const;

    await expect(service.enqueueRetry('log-1', actor)).resolves.toEqual({
      callbackLogId: 'log-1',
      jobId: 'courier-callback-retry-log-1-2',
      status: 'QUEUED',
    });
    expect(queue.add).toHaveBeenCalledWith(
      COURIER_CALLBACK_RETRY_JOB,
      { callbackLogId: 'log-1', initiatedByActorId: 'admin-1' },
      { jobId: 'courier-callback-retry-log-1-2' },
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COURIER_CALLBACK_RETRY_QUEUED',
        entityId: 'log-1',
        actor,
      }),
    );
  });
});
