import { TenantFanoutService } from './tenant-fanout.service';
import type { PlatformPrismaService } from '../platform/platform-prisma.service';

describe('TenantFanoutService (MT-8 §11.2)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const registry = (orgId: string) => ({
    id: `tdb-${orgId}`,
    organizationId: orgId,
    host: 'localhost',
    port: 5432,
    databaseName: `db_${orgId}`,
    username: 'u',
    credentialCipher: 'cipher',
  });

  function build(registries: ReturnType<typeof registry>[]) {
    const platform = {
      client: {
        tenantDatabase: {
          findMany: jest.fn().mockImplementation(({ cursor, take }) => {
            const start = cursor
              ? registries.findIndex(({ id }) => id === cursor.id) + 1
              : 0;
            return Promise.resolve(registries.slice(start, start + take));
          }),
        },
      },
    };
    const manager = {
      getClient: jest.fn().mockResolvedValue({}),
      runTransient: jest.fn().mockImplementation((_material, operation) => operation()),
    };
    return {
      service: new TenantFanoutService(platform as never, manager as never),
      manager,
      platform,
    };
  }

  it('runs the handler once without context in LEGACY mode', async () => {
    process.env.TENANCY_ENABLED = 'false';
    const { service } = build([registry('org-1')]);
    const calls: string[] = [];
    await service.forEachTenant(async () => {
      calls.push('run');
    }, { label: 'test' });
    expect(calls).toEqual(['run']); // exactly one legacy run
  });

  it('fans out to every ready tenant inside its own context', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { service } = build([registry('org-1'), registry('org-2')]);
    const seen: string[] = [];
    const outcome = await service.forEachTenant(
      async () => {
        const { getTenantContext } = require('./tenant-context');
        seen.push(getTenantContext().organizationId);
      },
      { label: 'test' },
    );
    expect(seen.sort()).toEqual(['org-1', 'org-2']);
    expect(outcome.processed).toBe(2);
    expect(outcome.failures).toEqual([]);
  });

  it('paginates the tenant registry without skipping fleet work', async () => {
    process.env.TENANCY_ENABLED = 'true';
    process.env.TENANT_FANOUT_PAGE_SIZE = '2';
    const built = build([
      registry('org-1'),
      registry('org-2'),
      registry('org-3'),
      registry('org-4'),
      registry('org-5'),
    ]);

    const outcome = await built.service.forEachTenant(async () => undefined, {
      label: 'paged-test',
    });

    expect(outcome.processed).toBe(5);
    expect(built.platform.client.tenantDatabase.findMany).toHaveBeenCalledTimes(3);
    expect(built.manager.runTransient).toHaveBeenCalledTimes(5);
  });

  it('bounds concurrent tenant operations', async () => {
    process.env.TENANCY_ENABLED = 'true';
    process.env.TENANT_FANOUT_CONCURRENCY = '2';
    const built = build([
      registry('org-1'),
      registry('org-2'),
      registry('org-3'),
      registry('org-4'),
    ]);
    let active = 0;
    let maximumActive = 0;
    (built.manager.runTransient as jest.Mock).mockImplementation(
      async (_material, operation) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        const result = await operation();
        active -= 1;
        return result;
      },
    );

    await built.service.forEachTenant(async () => undefined, {
      label: 'concurrency-test',
    });

    expect(maximumActive).toBe(2);
  });

  it('isolates one failing tenant without starving the others', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const built = build([registry('org-bad'), registry('org-good')]);
    // First getClient call (org-bad sorts first) explodes; second succeeds.
    let n = 0;
    (built.manager.runTransient as jest.Mock).mockImplementation((_material, operation) => {
      n += 1;
      if (n === 1) throw new Error('connection refused');
      return operation();
    });
    const seen: string[] = [];
    const outcome = await built.service.forEachTenant(
      async () => {
        const { getTenantContext } = require('./tenant-context');
        seen.push(getTenantContext().organizationId);
      },
      { label: 'test' },
    );
    expect(seen).toEqual(['org-good']);
    expect(outcome.processed).toBe(1);
    expect(outcome.failures).toEqual([
      { organizationId: 'org-bad', error: 'connection refused' },
    ]);
  });
});
