import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { DeliveryPersonnelService } from '../delivery-personnel.service';

describe('DeliveryPersonnelService tenant GPS isolation', () => {
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

  function riderClient(riderId: string) {
    const rider = {
      id: riderId,
      userId: 'same-rider-user-id',
      name: riderId,
      status: 'APPROVED',
    };
    return {
      deliveryPersonnel: {
        findUnique: jest.fn().mockResolvedValue(rider),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue(rider),
      },
      deliveryLocationHistory: {
        count: jest.fn().mockResolvedValue(4),
        create: jest.fn().mockResolvedValue({ id: `location-${riderId}` }),
      },
      user: { findUnique: jest.fn() },
    };
  }

  it('writes the same rider user ID to the current tenant database only', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = riderClient('rider-a');
    const tenantB = riderClient('rider-b');
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new DeliveryPersonnelService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
      { emitRiderLocation: jest.fn() } as never,
    );

    await runWithTenantContext(context('org-a', 'tenant_a'), () =>
      service.updateLocation('same-rider-user-id', {
        latitude: 23.7,
        longitude: 90.4,
      }),
    );
    await runWithTenantContext(context('org-b', 'tenant_b'), () =>
      service.updateLocation('same-rider-user-id', {
        latitude: 22.3,
        longitude: 91.8,
      }),
    );

    expect(tenantA.deliveryLocationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          deliveryPersonnelId: 'rider-a',
          latitude: 23.7,
          longitude: 90.4,
          sequence: 5,
        },
      }),
    );
    expect(tenantB.deliveryLocationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          deliveryPersonnelId: 'rider-b',
          latitude: 22.3,
          longitude: 91.8,
          sequence: 5,
        },
      }),
    );
    expect(tenantA.deliveryPersonnel.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rider-a' } }),
    );
    expect(tenantB.deliveryPersonnel.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rider-b' } }),
    );
  });

  it('emits each location through the ambient tenant boundary', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenant = riderClient('rider-a');
    const emitRiderLocation = jest.fn();
    const tenantDb = { getOrLegacy: jest.fn().mockResolvedValue(tenant) };
    const service = new DeliveryPersonnelService(
      {} as never,
      { record: jest.fn() } as never,
      tenantDb as never,
      { emitRiderLocation } as never,
    );

    await runWithTenantContext(context('org-a', 'tenant_a'), () =>
      service.updateLocation('same-rider-user-id', {
        latitude: 23.7,
        longitude: 90.4,
      }),
    );

    expect(emitRiderLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        riderId: 'rider-a',
        latitude: 23.7,
        longitude: 90.4,
      }),
    );
  });
});
