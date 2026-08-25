import {
  TenantMetrics,
  buildStructuredLogEntry,
  registerTenantLogContextAccessor,
  resetTenantLogContextAccessor,
} from '@app/common';
import { runWithTenantContext, type TenantContext } from './tenant-context';
import { TenancyObservabilityService } from './tenancy-observability.service';

function tenantContext(organizationId: string): TenantContext {
  return Object.freeze({
    organizationId,
    tenantDatabaseId: `tdb-${organizationId}`,
    database: Object.freeze({
      id: `tdb-${organizationId}`,
      host: 'localhost',
      port: 5432,
      databaseName: `db_${organizationId}`,
      username: 'tester',
      credentialCipher: 'cipher',
    }),
    domainId: 'dom-test',
    hostname: `${organizationId}.ferio.test`,
    subscriptionStatus: 'ACTIVE' as const,
  }) as TenantContext;
}

describe('TenantMetrics', () => {
  beforeEach(() => TenantMetrics.reset());

  it('aggregates labeled counters and snapshots them deterministically', () => {
    TenantMetrics.increment('resolver_unknown_domain', { hostname: 'x.test' });
    TenantMetrics.increment('resolver_unknown_domain', { hostname: 'x.test' });
    TenantMetrics.increment('entitlement_denied', {
      code: 'PLAN_LIMIT_REACHED',
      featureKey: 'orders_per_month',
    });

    const snapshot = TenantMetrics.snapshot();
    expect(snapshot.totalIncrements).toBe(3);
    expect(snapshot.counters).toEqual([
      {
        name: 'entitlement_denied',
        labels: { code: 'PLAN_LIMIT_REACHED', featureKey: 'orders_per_month' },
        value: 1,
      },
      {
        name: 'resolver_unknown_domain',
        labels: { hostname: 'x.test' },
        value: 2,
      },
    ]);
  });

  it('ignores non-positive increments and bounds series cardinality', () => {
    TenantMetrics.increment('resolver_suspended', { hostname: 'a' }, 0);
    for (let i = 0; i < 600; i += 1) {
      TenantMetrics.increment('queue_tenant_failure', {
        organizationId: `org-${i}`,
      });
    }
    const snapshot = TenantMetrics.snapshot();
    expect(snapshot.totalIncrements).toBe(500);
    expect(snapshot.counters).toHaveLength(500);
  });
});

describe('StructuredLogger tenant envelope (MT-13 §16.1)', () => {
  afterEach(() => resetTenantLogContextAccessor());

  it('omits tenant identity outside resolved contexts', () => {
    const entry = buildStructuredLogEntry('log', 'Test', 'event_happened');
    expect(entry.organizationId).toBeUndefined();
    expect(entry.hostname).toBeUndefined();
  });

  it('stamps safe tenant identity inside resolved contexts once registered', () => {
    const observability = Object.create(
      TenancyObservabilityService.prototype,
    ) as TenancyObservabilityService;
    (observability as unknown as { logger: unknown }).logger = {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
    observability.onModuleInit();

    return runWithTenantContext(tenantContext('org-a'), () => {
      const entry = buildStructuredLogEntry('log', 'Test', 'event_happened');
      expect(entry.organizationId).toBe('org-a');
      expect(entry.hostname).toBe('org-a.ferio.test');
    });
  });

  it('never fails logging when the accessor throws', () => {
    registerTenantLogContextAccessor(() => {
      throw new Error('boom');
    });
    const entry = buildStructuredLogEntry('warn', 'Test', 'degraded_event');
    expect(entry.event).toBe('degraded_event');
    expect(entry.correlationId).toBeDefined();
  });
});

describe('TenancyObservabilityService.emitSnapshot', () => {
  beforeEach(() => TenantMetrics.reset());
  afterEach(() => resetTenantLogContextAccessor());

  it('emits counters as a structured event only when activity exists', () => {
    const logged: Array<{ event: string; metadata: Record<string, unknown> }> = [];
    const service = Object.create(
      TenancyObservabilityService.prototype,
    ) as TenancyObservabilityService;
    (
      service as unknown as { logger: Record<string, unknown> }
    ).logger = {
      log: (event: string, metadata: Record<string, unknown>) =>
        logged.push({ event, metadata }),
    };

    service.emitSnapshot();
    expect(logged).toHaveLength(0);

    TenantMetrics.increment('db_breaker_opened', { tenantDatabaseId: 'tdb-1' });
    service.emitSnapshot();

    expect(logged).toHaveLength(1);
    expect(logged[0].event).toBe('tenant_metrics_snapshot');
    expect(logged[0].metadata.counters).toEqual([
      { name: 'db_breaker_opened', labels: { tenantDatabaseId: 'tdb-1' }, value: 1 },
    ]);
  });
});
