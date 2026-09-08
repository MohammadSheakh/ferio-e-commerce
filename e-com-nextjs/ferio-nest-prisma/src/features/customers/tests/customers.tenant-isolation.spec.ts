import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { CustomersService } from '../customers.service';

describe('CustomersService tenant isolation', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  function context(organizationId: string, databaseName: string) {
    return {
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
    };
  }

  function tenantCustomer(id: string, total: number) {
    return {
      id,
      name: `Customer ${id}`,
      phoneNormalized: '+8801700000000',
      phoneOriginal: '01700000000',
      email: `${id}@example.com`,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      user: null,
      addresses: [],
      orders: [],
      _count: { orders: total, addresses: 0 },
    };
  }

  it('calculates customer metrics only from the resolved tenant database', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      customer: {
        findUnique: jest
          .fn()
          .mockResolvedValue(tenantCustomer('same-customer', 2)),
      },
      order: {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { customerId: 'same-customer', _count: { id: 2 } },
          ])
          .mockResolvedValueOnce([
            {
              customerId: 'same-customer',
              _count: { id: 1 },
              _sum: { total: 30000 },
              _max: { createdAt: new Date('2026-09-02T00:00:00.000Z') },
            },
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
    };
    const tenantB = {
      customer: {
        findUnique: jest
          .fn()
          .mockResolvedValue(tenantCustomer('same-customer', 7)),
      },
      order: {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { customerId: 'same-customer', _count: { id: 7 } },
          ])
          .mockResolvedValueOnce([
            {
              customerId: 'same-customer',
              _count: { id: 4 },
              _sum: { total: 90000 },
              _max: { createdAt: new Date('2026-09-03T00:00:00.000Z') },
            },
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new CustomersService({} as never, tenantDb as never);

    const detailA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.detail('same-customer'),
    );
    const detailB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.detail('same-customer'),
    );

    expect(detailA.metrics.totalOrderCount).toBe(2);
    expect(detailA.metrics.deliveredSpend).toBe(30000);
    expect(detailB.metrics.totalOrderCount).toBe(7);
    expect(detailB.metrics.deliveredSpend).toBe(90000);
    expect(tenantA.order.groupBy).toHaveBeenCalledTimes(5);
    expect(tenantB.order.groupBy).toHaveBeenCalledTimes(5);
  });
});
