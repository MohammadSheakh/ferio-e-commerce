/**
 * MT-9 §9.4 — authoritative usage-counter registry.
 *
 * Single source of truth for every metered SaaS metric: what it means, how
 * it aggregates, when it resets, and when owners should be warned. Plan
 * entitlements reference these keys; EntitlementsService enforces them;
 * UsageReconciliationService treats them as authoritative.
 */

export type UsageAggregation = 'realtime' | 'derived';

export type UsageResetPolicy = 'billing_period' | 'continuous';

export interface UsageMetricDefinition {
  /** Counter key — must match plan entitlement featureKeys. */
  key: string;
  label: string;
  /**
   * realtime: incremented at the monetizable event (orders_per_month).
   * derived: recomputed from authoritative facts by reconciliation
   * (products_max / staff_seats evaluate live counts at gate time).
   */
  aggregation: UsageAggregation;
  reset: UsageResetPolicy;
  /** Fraction of the plan limit (0..1] that triggers a warning. */
  warningThreshold: number;
}

export const USAGE_METRICS: readonly UsageMetricDefinition[] = [
  {
    key: 'orders_per_month',
    label: 'Orders this billing period',
    aggregation: 'realtime',
    reset: 'billing_period',
    warningThreshold: 0.8,
  },
  {
    key: 'products_max',
    label: 'Catalog size (non-archived products)',
    aggregation: 'derived',
    reset: 'continuous',
    warningThreshold: 0.9,
  },
  {
    key: 'staff_seats',
    label: 'Active staff seats',
    aggregation: 'derived',
    reset: 'continuous',
    warningThreshold: 1,
  },
] as const;

const BY_KEY = new Map(USAGE_METRICS.map((metric) => [metric.key, metric]));

export function getUsageMetric(key: string): UsageMetricDefinition | undefined {
  return BY_KEY.get(key);
}

export function usageMetricKeys(): string[] {
  return USAGE_METRICS.map((metric) => metric.key);
}

/** UTC month start for a `YYYY-MM` period key — billing-period boundary. */
export function periodKeyStart(periodKey: string, now = new Date()): Date {
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    const [year, month] = periodKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }
  // Unknown/custom key shapes fall back to the current month start so a
  // malformed key can never widen the counted window.
  return periodKeyStart(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
}
