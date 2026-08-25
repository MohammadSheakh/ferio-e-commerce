import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  StructuredLogger,
  TenantMetrics,
  registerTenantLogContextAccessor,
} from '@app/common';
import { tryGetTenantContext } from './tenant-context';

const DEFAULT_LOG_INTERVAL_MS = 60_000;

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
export class TenancyObservabilityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger(TenancyObservabilityService.name);
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
  }
}
