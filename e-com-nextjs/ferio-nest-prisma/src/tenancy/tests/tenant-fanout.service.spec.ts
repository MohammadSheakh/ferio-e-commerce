import { TenantFanoutService } from '../services/tenant-fanout.service';
import { getTenantContext } from '../context/tenant-context';

type TenantOperation = () => Promise<unknown>;

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
  type Registry = ReturnType<typeof registry>;
  type RunTransient = (
    material: Registry,
    operation: TenantOperation,
  ) => Promise<unknown>;

  function build(registries: Registry[]) {
    type FindManyArgs = { cursor?: { id: string }; take: number };
    const findMany = jest.fn<Promise<Registry[]>, [FindManyArgs]>();
    findMany.mockImplementation(({ cursor, take }) => {
      const start = cursor
        ? registries.findIndex(({ id }) => id === cursor.id) + 1
        : 0;
      return Promise.resolve(registries.slice(start, start + take));
    });
    const platform = {
      client: {
        tenantDatabase: {
          findMany,
        },
      },
    };
    const runTransient = jest.fn<
      ReturnType<RunTransient>,
      Parameters<RunTransient>
    >();
    runTransient.mockImplementation((_material, operation) => operation());
    const manager = {
      getClient: jest.fn().mockResolvedValue({}),
      runTransient,
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
    await service.forEachTenant(
      () =>
        Promise.resolve().then(() => {
          calls.push('run');
        }),
      { label: 'test' },
    );
    expect(calls).toEqual(['run']); // exactly one legacy run
  });

  it('fans out to every ready tenant inside its own context', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { service } = build([registry('org-1'), registry('org-2')]);
    const seen: string[] = [];
    const outcome = await service.forEachTenant(
      () =>
        Promise.resolve().then(() => {
          seen.push(getTenantContext().organizationId);
        }),
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

    const outcome = await built.service.forEachTenant(() => Promise.resolve(), {
      label: 'paged-test',
    });

    expect(outcome.processed).toBe(5);
    expect(built.platform.client.tenantDatabase.findMany).toHaveBeenCalledTimes(
      3,
    );
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
    built.manager.runTransient.mockImplementation(
      async (_material, operation) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        const result = await operation();
        active -= 1;
        return result;
      },
    );

    await built.service.forEachTenant(() => Promise.resolve(), {
      label: 'concurrency-test',
    });

    expect(maximumActive).toBe(2);
  });

  it('keeps a 100-tenant simulation inside the configured concurrency bound', async () => {
    process.env.TENANCY_ENABLED = 'true';
    process.env.TENANT_FANOUT_PAGE_SIZE = '100';
    process.env.TENANT_FANOUT_CONCURRENCY = '4';
    const built = build(
      Array.from({ length: 100 }, (_, index) => registry(`org-${index}`)),
    );
    let active = 0;
    let maximumActive = 0;
    built.manager.runTransient.mockImplementation(
      async (_material, operation) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        const result = await operation();
        active -= 1;
        return result;
      },
    );

    const outcome = await built.service.forEachTenant(() => Promise.resolve(), {
      label: 'hundred-tenant-capacity-test',
    });

    expect(outcome.processed).toBe(100);
    expect(outcome.failures).toEqual([]);
    expect(maximumActive).toBeLessThanOrEqual(4);
  });

  it('isolates one failing tenant without starving the others', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const built = build([registry('org-bad'), registry('org-good')]);
    // First getClient call (org-bad sorts first) explodes; second succeeds.
    let n = 0;
    built.manager.runTransient.mockImplementation((_material, operation) => {
      n += 1;
      if (n === 1) throw new Error('connection refused');
      return operation();
    });
    const seen: string[] = [];
    const outcome = await built.service.forEachTenant(
      () =>
        Promise.resolve().then(() => {
          seen.push(getTenantContext().organizationId);
        }),
      { label: 'test' },
    );
    expect(seen).toEqual(['org-good']);
    expect(outcome.processed).toBe(1);
    expect(outcome.failures).toEqual([
      { organizationId: 'org-bad', error: 'connection refused' },
    ]);
  });
});
