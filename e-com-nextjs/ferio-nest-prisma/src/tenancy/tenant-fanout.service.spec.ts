import { TenantFanoutService } from './tenant-fanout.service';
import type { PlatformPrismaService } from '../platform/platform-prisma.service';

describe('TenantFanoutService (MT-8 §11.2)', () => {
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
      client: { tenantDatabase: { findMany: jest.fn().mockResolvedValue(registries) } },
    };
    const manager = { getClient: jest.fn().mockResolvedValue({}) };
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

  it('isolates one failing tenant without starving the others', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const built = build([registry('org-bad'), registry('org-good')]);
    // First getClient call (org-bad sorts first) explodes; second succeeds.
    let n = 0;
    (built.manager.getClient as jest.Mock).mockImplementation(() => {
      n += 1;
      if (n === 1) throw new Error('connection refused');
      return Promise.resolve({});
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
