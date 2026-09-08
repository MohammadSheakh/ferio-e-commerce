import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { StoreLocationsService } from '../store-locations.service';

describe('StoreLocationsService tenant isolation', () => {
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

  it('lists pickup stores from the resolved tenant database only', async () => {
    const tenantA = {
      warehouse: { findMany: jest.fn().mockResolvedValue([{ id: 'store-a' }]) },
    };
    const tenantB = {
      warehouse: { findMany: jest.fn().mockResolvedValue([{ id: 'store-b' }]) },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new StoreLocationsService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
    );

    const storesA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.listPublicStores(),
    );
    const storesB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.listPublicStores(),
    );

    expect(storesA).toEqual([{ id: 'store-a' }]);
    expect(storesB).toEqual([{ id: 'store-b' }]);
    expect(tenantA.warehouse.findMany).toHaveBeenCalledTimes(1);
    expect(tenantB.warehouse.findMany).toHaveBeenCalledTimes(1);
  });
});
