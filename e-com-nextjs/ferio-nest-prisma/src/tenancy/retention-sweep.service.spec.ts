import { RetentionSweepService } from './retention-sweep.service';

interface SelectionArgs {
  where: { createdAt: { lt: Date } };
  take: number;
}

interface DeleteArgs {
  where: { id: { in: string[] }; createdAt: { lt: Date } };
}

interface RetentionDelegateDouble {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
}

type RetentionModel =
  | 'commerceMessage'
  | 'storefrontAnalyticsEvent'
  | 'deliveryLocationHistory'
  | 'auditLog';

type RetentionClientDouble = Record<RetentionModel, RetentionDelegateDouble>;

type RetentionPlatformDouble = {
  client: {
    tenantDatabase: { findUnique: jest.Mock; findMany: jest.Mock };
    organizationMember: { count: jest.Mock };
  };
};

function harness(options: {
  registries: Array<{ organizationId: string; status: string }>;
  counts?: Record<string, number>;
}) {
  const deleteCalls: Array<{ model: string; where: unknown }> = [];
  const selectionCalls: Array<{ model: string; args: SelectionArgs }> = [];
  const platform: RetentionPlatformDouble = {
    client: {
      tenantDatabase: {
        findUnique: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { organizationId: string } }) =>
              Promise.resolve(
                options.registries.find(
                  (r) => r.organizationId === where.organizationId,
                ) ?? null,
              ),
          ),
        findMany: jest
          .fn()
          .mockResolvedValue(
            options.registries.filter((r) => r.status === 'READY'),
          ),
      },
      organizationMember: { count: jest.fn() },
    },
  };
  const makeClient = (): RetentionClientDouble => {
    const delegate = (model: RetentionModel): RetentionDelegateDouble => {
      let remaining = options.counts?.[model] ?? 0;
      return {
        findMany: jest.fn().mockImplementation((args: SelectionArgs) => {
          selectionCalls.push({ model, args });
          const count = Math.min(remaining, args.take);
          return Promise.resolve(
            Array.from({ length: count }, (_, index) => ({
              id: `${model}-${remaining - index}`,
            })),
          );
        }),
        deleteMany: jest.fn().mockImplementation((args: DeleteArgs) => {
          deleteCalls.push({ model, where: args });
          const count = Math.min(args.where.id.in.length, remaining);
          remaining -= count;
          return Promise.resolve({ count });
        }),
      };
    };
    return {
      commerceMessage: delegate('commerceMessage'),
      storefrontAnalyticsEvent: delegate('storefrontAnalyticsEvent'),
      deliveryLocationHistory: delegate('deliveryLocationHistory'),
      auditLog: delegate('auditLog'),
    };
  };
  const clients = new Map<string, RetentionClientDouble>();
  const manager = {
    getClient: jest.fn().mockImplementation((material: { id: string }) => {
      if (!clients.has(material.id)) clients.set(material.id, makeClient());
      return Promise.resolve(clients.get(material.id));
    }),
    runTransient: jest
      .fn()
      .mockImplementation(
        async (material: { id: string }, operation: () => Promise<unknown>) => {
          await manager.getClient(material);
          return operation();
        },
      ),
  };
  const service = new RetentionSweepService(
    platform as never,
    manager as never,
  );
  return {
    service,
    platform,
    deleteCalls,
    selectionCalls,
  };
}

describe('RetentionSweepService (brutal-audit #7 — unbounded growth)', () => {
  beforeEach(() => {
    process.env.RETENTION_COMMERCE_MESSAGE_DAYS = '180';
    process.env.RETENTION_STOREFRONT_ANALYTICS_DAYS = '365';
    process.env.RETENTION_GPS_DAYS = '90';
    process.env.RETENTION_AUDIT_LOG_DAYS = '0'; // explicit OFF in this test
    process.env.RETENTION_DELETE_BATCH_SIZE = '500';
    process.env.RETENTION_MAX_ROWS_PER_RULE = '10000';
  });

  it('prunes enabled models and honors explicitly disabled AuditLog retention', async () => {
    const h = harness({
      registries: [{ organizationId: 'org-a', status: 'READY' }],
      counts: {
        commerceMessage: 12,
        storefrontAnalyticsEvent: 40,
        deliveryLocationHistory: 7,
      },
    });

    const report = await h.service.sweepTenant('org-a');

    expect(report.totalDeleted).toBe(59);
    expect(
      report.results.find((r) => r.model === 'CommerceMessage')!.deleted,
    ).toBe(12);
    expect(report.results.find((r) => r.model === 'AuditLog')!.enabled).toBe(
      false,
    );
    // AuditLog deleteMany never called while disabled.
    expect(h.deleteCalls.some((call) => call.model === 'auditLog')).toBe(false);
    // Cutoffs are strictly older-than.
    for (const call of h.selectionCalls) {
      const where = call.args.where;
      expect(where.createdAt.lt.getTime()).toBeLessThan(Date.now());
    }
  });

  it('deletes in bounded batches and stops at the per-rule row budget', async () => {
    process.env.RETENTION_DELETE_BATCH_SIZE = '2';
    process.env.RETENTION_MAX_ROWS_PER_RULE = '5';
    const h = harness({
      registries: [{ organizationId: 'org-a', status: 'READY' }],
      counts: { commerceMessage: 9 },
    });

    const report = await h.service.sweepTenant('org-a');
    const messages = report.results.find(
      (result) => result.model === 'CommerceMessage',
    )!;

    expect(messages).toMatchObject({
      deleted: 5,
      batches: 3,
      truncated: true,
    });
    expect(
      h.deleteCalls.filter(({ model }) => model === 'commerceMessage'),
    ).toHaveLength(3);
  });

  it('isolates a failing tenant without blocking the fleet sweep', async () => {
    const platform: RetentionPlatformDouble = {
      client: {
        tenantDatabase: {
          findUnique: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { organizationId: string } }) =>
                Promise.resolve(
                  where.organizationId === 'org-bad'
                    ? null // sweepTenant throws NOT_READY for this org
                    : {
                        id: `tdb-${where.organizationId}`,
                        status: 'READY',
                        organizationId: where.organizationId,
                      },
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
    const fleetClient: RetentionClientDouble = {
      commerceMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      storefrontAnalyticsEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      deliveryLocationHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const manager = {
      getClient: jest.fn().mockResolvedValue(fleetClient),
      runTransient: jest
        .fn()
        .mockImplementation(
          async (
            material: { id: string },
            operation: () => Promise<unknown>,
          ) => {
            await manager.getClient(material);
            return operation();
          },
        ),
    };
    const service = new RetentionSweepService(
      platform as never,
      manager as never,
    );

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
