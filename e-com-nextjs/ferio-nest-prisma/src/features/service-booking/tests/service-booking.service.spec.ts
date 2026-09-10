import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { ServiceBookingService } from '../service-booking.service';

function tenantContext(organizationId: string) {
  return {
    correlationId: `correlation-${organizationId}`,
    organizationId,
    tenantDatabaseId: `database-${organizationId}`,
    database: {
      id: `database-${organizationId}`,
      host: 'localhost',
      port: 5432,
      databaseName: `tenant_${organizationId}`,
      username: 'tenant',
      credentialCipher: 'encrypted',
    },
    domainId: `domain-${organizationId}`,
    hostname: `${organizationId}.ferio.test`,
    subscriptionStatus: 'ACTIVE' as const,
  };
}

describe('ServiceBookingService internal-alpha flow', () => {
  type OrganizationId = 'org-a' | 'org-b';
  type TenantDatabaseMock = {
    serviceOffering: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    serviceBooking: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    serviceBookingHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const databases: Record<OrganizationId, TenantDatabaseMock> = {
    'org-a': {
      serviceOffering: {
        findMany: jest.fn().mockResolvedValue([{ id: 'service-a' }]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'service-a',
          name: 'Repair A',
          status: 'ACTIVE',
          leadTimeHours: 24,
          price: 500,
          durationMinutes: 60,
        }),
        create: jest.fn().mockResolvedValue({ id: 'service-a' }),
      },
      serviceBooking: {
        create: jest.fn().mockResolvedValue({
          id: 'booking-a',
          status: 'REQUESTED',
          history: [{ newStatus: 'REQUESTED' }],
        }),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-a',
          status: 'REQUESTED',
        }),
      },
      serviceBookingHistory: { create: jest.fn() },
      $transaction: jest.fn((callback: (db: TenantDatabaseMock) => unknown) =>
        callback(databases['org-a']),
      ),
    },
    'org-b': {
      serviceOffering: {
        findMany: jest.fn().mockResolvedValue([{ id: 'service-b' }]),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      serviceBooking: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      serviceBookingHistory: { create: jest.fn() },
      $transaction: jest.fn(),
    },
  };

  const tenantDb = {
    getOrLegacy: jest.fn(
      () => databases[getTenantContext().organizationId as OrganizationId],
    ),
  };
  const service = new ServiceBookingService({} as never, tenantDb as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps service discovery tenant-local', async () => {
    const servicesA = await runWithTenantContext(tenantContext('org-a'), () =>
      service.publicServices(),
    );
    const servicesB = await runWithTenantContext(tenantContext('org-b'), () =>
      service.publicServices(),
    );

    expect(servicesA).toEqual([{ id: 'service-a' }]);
    expect(servicesB).toEqual([{ id: 'service-b' }]);
    expect(databases['org-a'].serviceOffering.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(databases['org-b'].serviceOffering.findMany).toHaveBeenCalledTimes(
      1,
    );
  });

  it('runs publish, booking, and admin status transitions in one tenant', async () => {
    const published = await runWithTenantContext(tenantContext('org-a'), () =>
      service.save({
        name: 'Repair A',
        description: 'Repair service for tenant A',
        categoryId: 'category-a',
        price: 500,
        durationMinutes: 60,
        status: 'ACTIVE',
      }),
    );
    const booking = await runWithTenantContext(tenantContext('org-a'), () =>
      service.book({
        serviceId: 'service-a',
        customerName: 'Customer A',
        phone: '01700000000',
        preferredAt: future.toISOString(),
        address: 'Tenant A address',
      }),
    );
    const completed = await runWithTenantContext(tenantContext('org-a'), () =>
      service.status(
        'booking-a',
        { status: 'CONFIRMED', note: 'Accepted by tenant A' },
        { userId: 'admin-a' } as never,
      ),
    );

    expect(published).toEqual({ id: 'service-a' });
    expect(booking).toMatchObject({ id: 'booking-a', status: 'REQUESTED' });
    expect(completed).toBeDefined();
    const createCall = databases['org-a'].serviceBooking.create.mock
      .calls[0] as unknown[] | undefined;
    const createInput = createCall?.[0] as
      | { data?: Record<string, unknown> }
      | undefined;
    expect(createInput?.data).toMatchObject({
      serviceId: 'service-a',
      customerName: 'Customer A',
      serviceNameSnapshot: 'Repair A',
    });
    expect(databases['org-b'].serviceBooking.create).not.toHaveBeenCalled();
  });
});
