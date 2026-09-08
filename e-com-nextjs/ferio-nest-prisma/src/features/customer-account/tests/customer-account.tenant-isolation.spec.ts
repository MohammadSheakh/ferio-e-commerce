import type { UserPayload } from '@app/common';
import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { CustomerAccountService } from '../customer-account.service';

describe('CustomerAccountService tenant isolation', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;
  const actor = {
    userId: 'same-user-id',
    email: 'owner@example.com',
    role: 'user',
  } as UserPayload;

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

  it('reads the same user ID from only the resolved tenant database', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: actor.userId,
          name: 'Tenant A owner',
          email: actor.email,
          phoneNumber: null,
          profileImageUrl: null,
          isEmailVerified: true,
          customer: {
            id: 'customer-a',
            name: 'Customer A',
            phoneNormalized: null,
            email: actor.email,
            addresses: [],
            orders: [],
            _count: { orders: 0 },
          },
        }),
      },
    };
    const tenantB = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: actor.userId,
          name: 'Tenant B owner',
          email: actor.email,
          phoneNumber: null,
          profileImageUrl: null,
          isEmailVerified: true,
          customer: {
            id: 'customer-b',
            name: 'Customer B',
            phoneNormalized: null,
            email: actor.email,
            addresses: [],
            orders: [],
            _count: { orders: 0 },
          },
        }),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new CustomerAccountService({} as never, tenantDb as never);

    await expect(
      runWithTenantContext(context('org-a', 'tenant_a'), () =>
        service.profile(actor),
      ),
    ).resolves.toMatchObject({ customer: { id: 'customer-a' } });
    await expect(
      runWithTenantContext(context('org-b', 'tenant_b'), () =>
        service.profile(actor),
      ),
    ).resolves.toMatchObject({ customer: { id: 'customer-b' } });

    expect(tenantA.user.findUnique).toHaveBeenCalledTimes(1);
    expect(tenantB.user.findUnique).toHaveBeenCalledTimes(1);
  });
});
