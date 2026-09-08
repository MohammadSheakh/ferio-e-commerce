/**
 * MT-13 §16.1 — lightweight tenant-isolation metric counters.
 *
 * In-process labeled counters for the isolation-critical failure paths
 * (unknown domains, entitlement denials, tenant DB breaker events, queue
 * fan-out failures). Snapshots are emitted as structured logs by the
 * TenancyObservabilityService so any log pipeline can alert without a
 * dedicated metrics stack; a real metrics backend remains an infrastructure
 * decision (owner-gated) and can consume the same snapshot shape.
 */

export type TenantMetricName =
  | 'resolver_unknown_domain'
  | 'resolver_failed'
  | 'resolver_suspended'
  | 'resolver_tenant_unavailable'
  | 'resolver_migration_required'
  | 'entitlement_denied'
  | 'db_acquire_failure'
  | 'db_breaker_opened'
  | 'db_client_evicted'
  | 'db_capacity_exhausted'
  | 'queue_tenant_failure'
  | 'migration_run_started'
  | 'migration_tenant_succeeded'
  | 'migration_tenant_failed'
  | 'migration_run_paused'
  | 'migration_run_completed'
  | 'provisioning_run_started'
  | 'provisioning_run_completed'
  | 'provisioning_run_failed'
  | 'platform_billing_invoice_created'
  | 'platform_billing_payment_initiated'
  | 'platform_billing_payment_session_created'
  | 'platform_billing_payment_succeeded'
  | 'platform_billing_payment_failed'
  | 'usage_threshold_crossed'
  | 'usage_reconciliation_drift';

const MAX_LABEL_KEYS = 4;
const MAX_LABEL_VALUE = 128;
const MAX_DISTINCT_SERIES = 500;

export type TenantMetricLabels = Record<string, string>;

export type TenantMetricSeries = {
  name: TenantMetricName;
  labels: TenantMetricLabels;
  value: number;
};

export type TenantMetricsSnapshot = {
  observedSince: string;
  totalIncrements: number;
  counters: TenantMetricSeries[];
};

function stableLabelKey(
  name: TenantMetricName,
  labels: TenantMetricLabels,
): string {
  const keys = Object.keys(labels).sort().slice(0, MAX_LABEL_KEYS);
  const parts = keys.map(
    (key) =>
      `${key}=${String(labels[key] ?? '')
        .slice(0, MAX_LABEL_VALUE)
        .trim()}`,
  );
  return `${name}{${parts.join(',')}}`;
}

export class TenantMetrics {
  private static observedSince = new Date();
  private static totalIncrements = 0;
  private static readonly counts = new Map<string, number>();
  private static readonly labelSets = new Map<
    string,
    { name: TenantMetricName; labels: TenantMetricLabels }
  >();

  static increment(
    name: TenantMetricName,
    labels: TenantMetricLabels = {},
    by = 1,
  ): void {
    if (by <= 0 || !Number.isFinite(by)) return;
    const key = stableLabelKey(name, labels);
    const next = (this.counts.get(key) ?? 0) + by;
    // Bound cardinality: drop new series beyond the cap instead of growing
    // unbounded from hostile/host-varied label values.
    if (!this.counts.has(key) && this.counts.size >= MAX_DISTINCT_SERIES) {
      return;
    }
    this.counts.set(key, next);
    if (!this.labelSets.has(key)) {
      this.labelSets.set(key, { name, labels });
    }
    this.totalIncrements += by;
  }

  static snapshot(): TenantMetricsSnapshot {
    const counters: TenantMetricSeries[] = [...this.counts.entries()]
      .map(([key, value]) => {
        const meta = this.labelSets.get(key)!;
        return { name: meta.name, labels: { ...meta.labels }, value };
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.value - b.value);
    return {
      observedSince: this.observedSince.toISOString(),
      totalIncrements: this.totalIncrements,
      counters,
    };
  }

  /** Test isolation helper. */
  static reset(): void {
    this.observedSince = new Date();
    this.totalIncrements = 0;
    this.counts.clear();
    this.labelSets.clear();
  }
}
