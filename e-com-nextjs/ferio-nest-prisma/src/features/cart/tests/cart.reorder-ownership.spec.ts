import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { CartService } from '../cart.service';

describe('CartService reorder tenant ownership', () => {
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

  it('does not reorder an order owned by another tenant customer', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ customerId: 'customer-a' }),
      },
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const tenantB = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ customerId: 'customer-b' }),
      },
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new CartService({} as never, undefined, tenantDb as never);
    const actor = { userId: 'same-user-id' };

    await expect(
      runWithTenantContext(context('org-a', 'tenant_a'), () =>
        service.reorderFromOrder('same-order-id', undefined, undefined, actor),
      ),
    ).rejects.toThrow('Order not found');
    await expect(
      runWithTenantContext(context('org-b', 'tenant_b'), () =>
        service.reorderFromOrder('same-order-id', undefined, undefined, actor),
      ),
    ).rejects.toThrow('Order not found');

    expect(tenantA.order.findFirst).toHaveBeenCalledTimes(1);
    expect(tenantB.order.findFirst).toHaveBeenCalledTimes(1);
  });
});
