import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { SettlementsService } from '../services/settlements.service';

describe('SettlementsService tenant isolation', () => {
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

  it('lists settlement records from the resolved tenant database only', async () => {
    const tenantA = {
      courierSettlement: {
        findMany: jest.fn().mockResolvedValue([{ id: 'settlement-a' }]),
      },
    };
    const tenantB = {
      courierSettlement: {
        findMany: jest.fn().mockResolvedValue([{ id: 'settlement-b' }]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new SettlementsService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
    );

    const settlementsA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.list(),
    );
    const settlementsB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.list(),
    );

    expect(settlementsA).toEqual([{ id: 'settlement-a' }]);
    expect(settlementsB).toEqual([{ id: 'settlement-b' }]);
    expect(tenantA.courierSettlement.findMany).toHaveBeenCalledTimes(1);
    expect(tenantB.courierSettlement.findMany).toHaveBeenCalledTimes(1);
  });
});
