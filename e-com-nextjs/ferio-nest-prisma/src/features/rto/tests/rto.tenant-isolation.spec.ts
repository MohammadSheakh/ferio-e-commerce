import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { RtoService } from '../rto.service';

describe('RtoService tenant isolation', () => {
  const context = (organizationId: string, databaseName: string) => ({
    correlationId: `correlation-${organizationId}`,
    organizationId,
    tenantDatabaseId: `database-${organizationId}`,
    database: {
      id: `database-${organizationId}`,
      host: 'localhost',
      port: 5432,
      databaseName,
      username: 'tenant',
      credentialCipher: 'encrypted',
    },
    domainId: `domain-${organizationId}`,
    hostname: `${organizationId}.ferio.test`,
    subscriptionStatus: 'ACTIVE' as const,
  });

  it('lists RTO records from the resolved tenant database only', async () => {
    const tenantA = {
      rtoCase: { findMany: jest.fn().mockResolvedValue([{ id: 'rto-a' }]) },
    };
    const tenantB = {
      rtoCase: { findMany: jest.fn().mockResolvedValue([{ id: 'rto-b' }]) },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new RtoService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
    );

    const recordsA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.list(),
    );
    const recordsB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.list(),
    );

    expect(recordsA).toEqual([{ id: 'rto-a' }]);
    expect(recordsB).toEqual([{ id: 'rto-b' }]);
    expect(tenantA.rtoCase.findMany).toHaveBeenCalledTimes(1);
    expect(tenantB.rtoCase.findMany).toHaveBeenCalledTimes(1);
  });
});
