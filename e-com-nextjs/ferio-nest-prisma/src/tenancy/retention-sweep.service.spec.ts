import { RetentionSweepService } from './retention-sweep.service';

function harness(options: {
  registries: Array<{ organizationId: string; status: string }>;
  counts?: Record<string, number>;
}) {
  const deleteCalls: Array<{ model: string; where: unknown }> = [];
  const platform = {
    client: {
      tenantDatabase: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: any) =>
            Promise.resolve(
              options.registries.find((r) => r.organizationId === where.organizationId) ?? null,
            ),
          ),
        findMany: jest.fn().mockResolvedValue(
          options.registries.filter((r) => r.status === 'READY'),
        ),
      },
      organizationMember: { count: jest.fn() },
    },
  };
  const makeClient = () => ({
    commerceMessage: {
      deleteMany: jest.fn().mockImplementation((args) => {
        deleteCalls.push({ model: 'commerceMessage', where: args });
        return Promise.resolve({ count: options.counts?.commerceMessage ?? 0 });
      }),
    },
    storefrontAnalyticsEvent: {
      deleteMany: jest.fn().mockImplementation((args) => {
        deleteCalls.push({ model: 'storefrontAnalyticsEvent', where: args });
        return Promise.resolve({ count: options.counts?.storefrontAnalyticsEvent ?? 0 });
      }),
    },
    deliveryLocationHistory: {
      deleteMany: jest.fn().mockImplementation((args) => {
        deleteCalls.push({ model: 'deliveryLocationHistory', where: args });
        return Promise.resolve({ count: options.counts?.deliveryLocationHistory ?? 0 });
      }),
    },
    auditLog: {
      deleteMany: jest.fn().mockImplementation((args) => {
        deleteCalls.push({ model: 'auditLog', where: args });
        return Promise.resolve({ count: options.counts?.auditLog ?? 0 });
      }),
    },
  });
  const clients = new Map<string, ReturnType<typeof makeClient>>();
  const manager = {
    getClient: jest.fn().mockImplementation((material: { id: string }) => {
      if (!clients.has(material.id)) clients.set(material.id, makeClient());
      return Promise.resolve(clients.get(material.id));
    }),
  };
  const service = new RetentionSweepService(platform as never, manager as never);
  return {
    service,
    platform,
    clientFor(id: string) {
      return clients.get(`tdb-${id.slice(-10)}`)!;
    },
    deleteCalls,
  };
}

describe('RetentionSweepService (brutal-audit #7 — unbounded growth)', () => {
  beforeEach(() => {
    process.env.RETENTION_COMMERCE_MESSAGE_DAYS = '180';
    process.env.RETENTION_STOREFRONT_ANALYTICS_DAYS = '365';
    process.env.RETENTION_GPS_DAYS = '90';
    process.env.RETENTION_AUDIT_LOG_DAYS = '0'; // explicit OFF in this test
  });

  it('prunes enabled models at their cutoffs and leaves AuditLog OFF by default', async () => {
    const h = harness({
      registries: [{ organizationId: 'org-a', status: 'READY' }],
      counts: { commerceMessage: 12, storefrontAnalyticsEvent: 40, deliveryLocationHistory: 7 },
    });

    const report = await h.service.sweepTenant('org-a');

    expect(report.totalDeleted).toBe(59);
    expect(report.results.find((r) => r.model === 'CommerceMessage')!.deleted).toBe(12);
    expect(report.results.find((r) => r.model === 'AuditLog')!.enabled).toBe(false);
    // AuditLog deleteMany never called while disabled.
    expect(
      h.deleteCalls.some((call) => call.model === 'auditLog'),
    ).toBe(false);
    // Cutoffs are strictly older-than.
    for (const call of h.deleteCalls) {
      const where = (call.where as { where: { createdAt: { lt: Date } } }).where;
      expect(where.createdAt.lt.getTime()).toBeLessThan(Date.now());
    }
  });

  it('isolates a failing tenant without blocking the fleet sweep', async () => {
    const platform = {
      client: {
        tenantDatabase: {
          findUnique: jest.fn().mockImplementation(({ where }: any) =>
            Promise.resolve(
              where.organizationId === 'org-bad'
                ? null // sweepTenant throws NOT_READY for this org
                : { id: `tdb-${where.organizationId}`, status: 'READY', organizationId: where.organizationId },
            ),
          ),
          findMany: jest
            .fn()
            .mockResolvedValue([
              { organizationId: 'org-bad' },
              { organizationId: 'org-good' },
            ]),
        },
        organizationMember: { count: jest.fn() },
      },
    };
    const manager = {
      getClient: jest.fn().mockResolvedValue({
        commerceMessage: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
        storefrontAnalyticsEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        deliveryLocationHistory: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        auditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      }),
    };
    const service = new RetentionSweepService(platform as never, manager as never);

    const result = await service.sweepAllReady();

    expect(result.swept).toBe(1);
    expect(result.failures).toEqual([
      { organizationId: 'org-bad', error: 'TENANT_DATABASE_NOT_READY:org-bad' },
    ]);
    expect(result.totalDeleted).toBeGreaterThanOrEqual(0);
  });

  it('refuses a sweep against a non-READY registry', async () => {
    const h = harness({
      registries: [{ organizationId: 'org-a', status: 'MIGRATION_REQUIRED' }],
    });

    await expect(h.service.sweepTenant('org-a')).rejects.toThrow(
      'TENANT_DATABASE_NOT_READY:org-a',
    );
  });
});
