import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { StorefrontAnalyticsService } from '../storefront-analytics.service';

describe('StorefrontAnalyticsService tenant isolation', () => {
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

  it('aggregates search metrics from the resolved tenant database only', async () => {
    const tenantA = {
      storefrontAnalyticsEvent: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { searchTerm: 'tenant-a', _count: { searchTerm: 4 } },
          ]),
      },
    };
    const tenantB = {
      storefrontAnalyticsEvent: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { searchTerm: 'tenant-b', _count: { searchTerm: 7 } },
          ]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new StorefrontAnalyticsService(
      {} as never,
      {} as never,
      {} as never,
      tenantDb as never,
    );

    const searchesA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.getTopSearches(),
    );
    const searchesB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.getTopSearches(),
    );

    expect(searchesA).toEqual([{ query: 'tenant-a', count: 4 }]);
    expect(searchesB).toEqual([{ query: 'tenant-b', count: 7 }]);
    expect(tenantA.storefrontAnalyticsEvent.groupBy).toHaveBeenCalledTimes(1);
    expect(tenantB.storefrontAnalyticsEvent.groupBy).toHaveBeenCalledTimes(1);
  });
});
