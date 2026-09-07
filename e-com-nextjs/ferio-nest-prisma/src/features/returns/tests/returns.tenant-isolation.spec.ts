import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { ReturnsService } from '../services/returns.service';

describe('ReturnsService tenant isolation', () => {
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

  it('reads return cases from the resolved tenant database only', async () => {
    const tenantA = {
      returnCase: {
        findMany: jest.fn().mockResolvedValue([{ id: 'return-a' }]),
      },
    };
    const tenantB = {
      returnCase: {
        findMany: jest.fn().mockResolvedValue([{ id: 'return-b' }]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new ReturnsService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
    );

    const casesA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.getOrderCases('same-order-id'),
    );
    const casesB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.getOrderCases('same-order-id'),
    );

    expect(casesA).toEqual([{ id: 'return-a' }]);
    expect(casesB).toEqual([{ id: 'return-b' }]);
    expect(tenantA.returnCase.findMany).toHaveBeenCalledTimes(1);
    expect(tenantB.returnCase.findMany).toHaveBeenCalledTimes(1);
  });
});
