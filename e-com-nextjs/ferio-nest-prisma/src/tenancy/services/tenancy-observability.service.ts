import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  StructuredLogger,
  TenantMetrics,
  type TenantMetricName,
  registerTenantLogContextAccessor,
} from '@app/common';
import { tryGetTenantContext } from '../context/tenant-context';

const DEFAULT_LOG_INTERVAL_MS = 60_000;
const ISOLATION_ALERT_THRESHOLDS: Partial<Record<TenantMetricName, number>> = {
  resolver_failed: 1,
  resolver_tenant_unavailable: 1,
  resolver_migration_required: 1,
  db_breaker_opened: 1,
  db_capacity_exhausted: 1,
  queue_tenant_failure: 1,
  migration_run_paused: 1,
  provisioning_run_failed: 1,
};

/**
 * MT-13 §16.1 — tenant observability envelope.
 *
 * - Registers the ambient TenantContext accessor so every StructuredLogger
 *   entry carries safe tenant identity (organizationId + hostname) when a
 *   request runs inside a resolved tenant.
 * - Periodically emits TenantMetrics counters as a structured log event so
 *   isolation-critical signals (unknown domains, entitlement denials, DB
 *   breaker events, queue fan-out failures) are alertable from any log
 *   pipeline without requiring a metrics-stack decision first.
 */
@Injectable()
export class TenancyObservabilityService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new StructuredLogger(
    TenancyObservabilityService.name,
  );
  private snapshotTimer?: ReturnType<typeof setInterval>;

  onModuleInit(): void {
    registerTenantLogContextAccessor(() => {
      const context = tryGetTenantContext();
      return context
        ? { organizationId: context.organizationId, hostname: context.hostname }
        : undefined;
    });

    const intervalMs = Number(
      process.env.TENANT_METRICS_LOG_INTERVAL_MS ?? DEFAULT_LOG_INTERVAL_MS,
    );
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      this.snapshotTimer = setInterval(() => this.emitSnapshot(), intervalMs);
      this.snapshotTimer.unref?.();
    }
  }

  onModuleDestroy(): void {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
  }

  emitSnapshot(): void {
    const snapshot = TenantMetrics.snapshot();
    if (snapshot.totalIncrements === 0) return;
    this.logger.log('tenant_metrics_snapshot', { ...snapshot });
    for (const counter of snapshot.counters) {
      const threshold = ISOLATION_ALERT_THRESHOLDS[counter.name];
      if (threshold === undefined || counter.value < threshold) continue;
      this.logger.error(
        'tenant_isolation_alert',
        new Error(`${counter.name} crossed its alert threshold`),
        {
          metric: counter.name,
          value: counter.value,
          threshold,
          labels: counter.labels,
        },
      );
    }
  }
}
