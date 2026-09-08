import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { OrderService } from '../order.service';

describe('OrderService tracking tenant isolation', () => {
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

  function trackedOrder(status: string) {
    return {
      reference: 'FER-260908-SHARED',
      status,
      paymentMethod: 'COD',
      total: 1000,
      currency: 'BDT',
      createdAt: new Date('2026-09-08T00:00:00.000Z'),
      address: { phoneNormalized: '+8801712345678' },
      statusHistory: [],
      shipment: null,
    };
  }

  it('looks up an overlapping reference only in the resolved tenant database', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      order: {
        findUnique: jest.fn().mockResolvedValue(trackedOrder('CONFIRMED')),
      },
    };
    const tenantB = {
      order: {
        findUnique: jest.fn().mockResolvedValue(trackedOrder('DELIVERED')),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new OrderService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      tenantDb as never,
    );

    const dto = { reference: 'fer-260908-shared', phone: '01712345678' };
    const orderA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.trackOrder(dto),
    );
    const orderB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.trackOrder(dto),
    );

    expect(orderA.status).toBe('CONFIRMED');
    expect(orderB.status).toBe('DELIVERED');
    expect(tenantA.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tenantB.order.findUnique).toHaveBeenCalledTimes(1);
    expect(tenantA.order.findUnique.mock.calls[0][0].where).toEqual({
      reference: 'FER-260908-SHARED',
    });
    expect(tenantB.order.findUnique.mock.calls[0][0].where).toEqual({
      reference: 'FER-260908-SHARED',
    });
  });
});
