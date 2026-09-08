import { TenantMetrics } from '@app/common';
import { PlatformOperationsHealthService } from './platform-operations-health.service';

describe('PlatformOperationsHealthService', () => {
  beforeEach(() => {
    TenantMetrics.reset();
    process.env.DATABASE_BACKUP_ENABLED = 'true';
    process.env.OBJECT_STORAGE_PROTECTION_ENABLED = 'true';
    process.env.DATABASE_BACKUP_LAST_SUCCESS_AT = new Date().toISOString();
    process.env.DATABASE_RESTORE_LAST_VERIFIED_AT = new Date().toISOString();
  });

  it('returns bounded control-plane, queue, backup, and support evidence', async () => {
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 0,
        completed: 4,
        failed: 0,
        delayed: 0,
      }),
    };
    const service = new PlatformOperationsHealthService(
      {
        client: {
          $queryRaw: jest.fn().mockResolvedValue([]),
          tenantDatabase: {
            groupBy: jest.fn().mockResolvedValue([
              { status: 'READY', _count: { _all: 2 } },
            ]),
          },
        },
        poolMetrics: { totalCount: 2 },
      } as never,
      { countActive: jest.fn().mockResolvedValue(1) } as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );

    const result = await service.getHealth();

    expect(result.runtimeStatus).toBe('HEALTHY');
    expect(result.queues).toHaveLength(6);
    expect(result.tenantDatabases).toEqual({ READY: 2 });
    expect(result.backup.status).toBe('CURRENT');
    expect(result.backup.restoreStatus).toBe('VERIFIED');
    expect(result.support.activeGrants).toBe(1);
    expect(result.alerts).toContain(
      '1 support access grant(s) currently active.',
    );
    expect(JSON.stringify(result)).not.toContain('credential');
  });

  it('degrades when a queue probe fails without exposing provider errors', async () => {
    const queue = {
      getJobCounts: jest.fn().mockRejectedValue(new Error('secret queue error')),
    };
    const service = new PlatformOperationsHealthService(
      {
        client: {
          $queryRaw: jest.fn().mockResolvedValue([]),
          tenantDatabase: { groupBy: jest.fn().mockResolvedValue([]) },
        },
        poolMetrics: {},
      } as never,
      { countActive: jest.fn().mockResolvedValue(0) } as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );

    const result = await service.getHealth();

    expect(result.runtimeStatus).toBe('DEGRADED');
    expect(result.queues.every((item) => item.available === false)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('secret queue error');
  });
});
