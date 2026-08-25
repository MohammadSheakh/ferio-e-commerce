import { TenantMetrics } from '@app/common';
import { UsageService, currentPeriodKey } from './usage.service';
import {
  USAGE_METRICS,
  usageMetricKeys,
  getUsageMetric,
  periodKeyStart,
} from './usage-metrics.registry';
import {
  UsageReconciliationService,
  UsageReconciliationReport,
} from '../../tenancy/usage-reconciliation.service';

function platformWithEntitlements(limit: number | null): { client: Record<string, any> } {
  const subscription =
    limit === null
      ? null
      : {
          plan: {
            entitlements: [
              { featureKey: 'orders_per_month', enabled: true, limit },
            ],
          },
        };
  const counters = new Map<string, bigint>();
  return {
    client: {
      usageCounter: {
        upsert: jest.fn().mockImplementation(
          ({
            where,
            create,
            update,
          }: {
            where: { organizationId_metric_periodKey: { organizationId: string; metric: string; periodKey: string } };
            create: { value: bigint };
            update: { value: { increment?: bigint; set?: bigint } };
          }) => {
            const key = `${where.organizationId_metric_periodKey.organizationId}:${where.organizationId_metric_periodKey.metric}:${where.organizationId_metric_periodKey.periodKey}`;
            if (!counters.has(key)) {
              counters.set(key, create.value);
            } else if (update.value.increment !== undefined) {
              counters.set(key, counters.get(key)! + update.value.increment);
            } else if ((update.value as { set?: bigint }).set !== undefined) {
              counters.set(key, (update.value as { set: bigint }).set);
            } else if (typeof update.value === 'bigint') {
              // Prisma plain-value update == SET semantics
              counters.set(key, update.value);
            }
            return Promise.resolve({
              value: counters.get(key)!,
              metric: where.organizationId_metric_periodKey.metric,
            });
          },
        ),
        findUnique: jest.fn().mockImplementation(
          ({ where }: { where: { organizationId_metric_periodKey: { organizationId: string; metric: string; periodKey: string } } }) => {
            const k = `${where.organizationId_metric_periodKey.organizationId}:${where.organizationId_metric_periodKey.metric}:${where.organizationId_metric_periodKey.periodKey}`;
            const value = counters.get(k);
            return Promise.resolve(value === undefined ? null : { value });
          },
        ),
      },
      subscription: { findUnique: jest.fn().mockResolvedValue(subscription) },
    },
  };
}

describe('Usage metric registry (§9.4 authoritative counters)', () => {
  it('defines the canonical metered metrics with sane thresholds', () => {
    expect(usageMetricKeys()).toEqual([
      'orders_per_month',
      'products_max',
      'staff_seats',
    ]);
    for (const definition of USAGE_METRICS) {
      expect(definition.warningThreshold).toBeGreaterThan(0);
      expect(definition.warningThreshold).toBeLessThanOrEqual(1);
    }
    expect(getUsageMetric('orders_per_month')?.reset).toBe('billing_period');
    expect(getUsageMetric('products_max')?.aggregation).toBe('derived');
  });

  it('derives the UTC month start from a period key', () => {
    expect(periodKeyStart('2026-08').toISOString()).toBe('2026-08-01T00:00:00.000Z');
    // Malformed keys fall back to the current month start — never widen.
    const fallback = periodKeyStart('bogus');
    expect(fallback.getUTCDate()).toBe(1);
    void currentPeriodKey;
  });
});

describe('UsageService threshold warnings (§9.4)', () => {
  beforeEach(() => TenantMetrics.reset());

  function serviceWith(limit: number | null) {
    const platform = platformWithEntitlements(limit);
    const service = new UsageService(platform as never);
    return { service, platform };
  }

  it('warns exactly once when the increment crosses the threshold fraction', async () => {
    const { service } = serviceWith(100); // 80% warning threshold = 80

    await service.increment('org-a', 'orders_per_month', 79);
    expect(TenantMetrics.snapshot().totalIncrements).toBe(0);

    await service.increment('org-a', 'orders_per_month', 1); // lands exactly on 80
    expect(TenantMetrics.snapshot().totalIncrements).toBe(1);

    await service.increment('org-a', 'orders_per_month', 10); // already above
    expect(TenantMetrics.snapshot().totalIncrements).toBe(1);

    await service.increment('org-a', 'orders_per_month', 5); // still above
    expect(TenantMetrics.snapshot().totalIncrements).toBe(1);
  });

  it('never warns for metrics without a registry definition or limit', async () => {
    const unlimited = serviceWith(null);
    await unlimited.service.increment('org-a', 'orders_per_month', 500);
    expect(TenantMetrics.snapshot().totalIncrements).toBe(0);

    const unregistered = serviceWith(10);
    await unregistered.service.increment('org-a', 'unknown_metric', 9);
    expect(TenantMetrics.snapshot().totalIncrements).toBe(0);
  });

  it('setValue writes authoritative corrections and clamps negatives', async () => {
    const { service } = serviceWith(null);

    await service.setValue('org-a', 'products_max', BigInt(42));
    expect(await service.getValue('org-a', 'products_max')).toBe(BigInt(42));

    await service.setValue('org-a', 'products_max', -7);
    expect(await service.getValue('org-a', 'products_max')).toBe(BigInt(0));
  });
});

describe('UsageReconciliationService (§9.4 counter-vs-fact reconciliation)', () => {
  beforeEach(() => TenantMetrics.reset());

  function reconciliationWith(facts: {
    orders: number;
    products: number;
    staff: number;
    recordedOrders?: string;
  }) {
    const platform = platformWithEntitlements(null);
    platform.client.tenantDatabase = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tdb-1',
        organizationId: 'org-a',
        status: 'READY',
      }),
    };
    platform.client.organizationMember = {
      count: jest.fn().mockResolvedValue(facts.staff),
    };
    const usage = {
      getValue: jest
        .fn()
        .mockImplementation((_org: string, metric: string) =>
          Promise.resolve(
            metric === 'orders_per_month'
              ? BigInt(facts.recordedOrders ?? '0')
              : BigInt(0),
          ),
        ),
      setValue: jest.fn().mockResolvedValue(BigInt(0)),
    };
    const manager = {
      getClient: jest.fn().mockResolvedValue({
        order: { count: jest.fn().mockResolvedValue(facts.orders) },
        product: { count: jest.fn().mockResolvedValue(facts.products) },
      }),
    };
    const service = new UsageReconciliationService(
      platform as never,
      manager as never,
      usage as never,
    );
    return { service, usage };
  }

  it('detects drift, corrects to fact values, and reports per metric', async () => {
    const { service, usage } = reconciliationWith({
      orders: 120,
      products: 40,
      staff: 3,
      recordedOrders: '118',
    });

    const report: UsageReconciliationReport = await service.reconcileOrganization('org-a');

    expect(report.drifted).toBe(3); // orders + products + seats all differ
    const ordersEntry = report.entries.find((entry) => entry.metric === 'orders_per_month')!;
    expect(ordersEntry.counted).toBe(120);
    expect(ordersEntry.corrected).toBe(true);
    expect(usage.setValue).toHaveBeenCalledWith(
      'org-a',
      'orders_per_month',
      BigInt(120),
      report.periodKey,
    );

    const productsEntry = report.entries.find((entry) => entry.metric === 'products_max')!;
    expect(productsEntry.counted).toBe(40);
    expect(productsEntry.corrected).toBe(true);
  });

  it('counts staff seats from the control plane, not the tenant DB', async () => {
    const { service } = reconciliationWith({ orders: 0, products: 0, staff: 6 });

    const report = await service.reconcileOrganization('org-a');
    const seats = report.entries.find((entry) => entry.metric === 'staff_seats')!;
    expect(seats.source).toBe('control_plane');
    expect(seats.counted).toBe(6);
    expect(seats.corrected).toBe(true); // recorded 0 vs counted 6 → corrected
    expect(report.drifted).toBe(1); // only seats differ
  });

  it('refuses to reconcile a tenant whose database is not READY', async () => {
    const { service } = reconciliationWith({ orders: 0, products: 0, staff: 0 });
    const platformRef = service as unknown as {
      platform: {
        client: { tenantDatabase: { findUnique: jest.Mock } };
      };
    };
    platformRef.platform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      organizationId: 'org-a',
      status: 'MIGRATION_REQUIRED',
    });

    await expect(service.reconcileOrganization('org-a')).rejects.toThrow(
      'TENANT_DATABASE_NOT_READY:org-a',
    );
  });
});
