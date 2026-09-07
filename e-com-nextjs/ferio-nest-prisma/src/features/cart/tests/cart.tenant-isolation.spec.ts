import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { CartService } from '../cart.service';

describe('CartService saved-cart tenant isolation', () => {
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

  it('does not resolve a saved-cart token from another tenant database', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      savedCart: { findUnique: jest.fn() },
    };
    const tenantB = {
      savedCart: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    tenantA.savedCart.findUnique.mockResolvedValue({
      id: 'saved-a',
      name: 'Tenant A cart',
      shareToken: 'shared-token',
      userId: null,
      user: null,
      items: [],
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new CartService({} as never, undefined, tenantDb as never);

    await expect(
      runWithTenantContext(context('org-a', 'tenant_a'), () =>
        service.getSharedCart('shared-token'),
      ),
    ).resolves.toMatchObject({ id: 'saved-a' });

    await expect(
      runWithTenantContext(context('org-b', 'tenant_b'), () =>
        service.getSharedCart('shared-token'),
      ),
    ).rejects.toThrow('Shared cart not found');

    expect(tenantA.savedCart.findUnique).toHaveBeenCalledTimes(1);
    expect(tenantB.savedCart.findUnique).toHaveBeenCalledTimes(1);
  });
});
