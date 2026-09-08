import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { RefundsService } from '../services/refunds.service';

describe('RefundsService tenant isolation', () => {
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

  it('reads refunds for the same return ID from the current tenant only', async () => {
    const tenantA = {
      commerceRefund: {
        findMany: jest.fn().mockResolvedValue([{ id: 'refund-a' }]),
      },
    };
    const tenantB = {
      commerceRefund: {
        findMany: jest.fn().mockResolvedValue([{ id: 'refund-b' }]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new RefundsService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
    );

    const refundsA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.getReturnRefunds('same-return-id'),
    );
    const refundsB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.getReturnRefunds('same-return-id'),
    );

    expect(refundsA).toEqual([{ id: 'refund-a' }]);
    expect(refundsB).toEqual([{ id: 'refund-b' }]);
    expect(tenantA.commerceRefund.findMany).toHaveBeenCalledTimes(1);
    expect(tenantB.commerceRefund.findMany).toHaveBeenCalledTimes(1);
  });
});
