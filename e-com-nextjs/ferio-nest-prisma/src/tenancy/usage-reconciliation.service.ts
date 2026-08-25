import { Injectable } from '@nestjs/common';
import { StructuredLogger, TenantMetrics } from '@app/common';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { TenantDatabaseManager } from './tenant-database.manager';
import { tryGetTenantContext } from './tenant-context';
import { UsageService, currentPeriodKey } from '../platform/services/usage.service';
import {
  USAGE_METRICS,
  periodKeyStart,
} from '../platform/services/usage-metrics.registry';

export interface UsageReconciliationEntry {
  metric: string;
  source: 'tenant_db' | 'control_plane';
  counted: number;
  recorded: string;
  corrected: boolean;
}

export interface UsageReconciliationReport {
  organizationId: string;
  periodKey: string;
  entries: UsageReconciliationEntry[];
  drifted: number;
}

/**
 * MT-9 §9.4 — reconcile recorded usage counters against authoritative facts.
 *
 * - orders_per_month: recounted from the tenant database for the billing
 *   period (the realtime counter can drift on worker retries/outages).
 * - products_max: recounted from the tenant catalog (non-archived).
 * - staff_seats: recounted from control-plane active memberships.
 *
 * Counters are corrected to fact values and every drift is reported so
 * operators (and tests) can assert metering integrity.
 */
@Injectable()
export class UsageReconciliationService {
  private readonly logger = new StructuredLogger(UsageReconciliationService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly manager: TenantDatabaseManager,
    private readonly usage: UsageService,
  ) {}

  async reconcileOrganization(
    organizationId: string,
    periodKey = currentPeriodKey(),
  ): Promise<UsageReconciliationReport> {
    const registry = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
    });
    if (!registry || registry.status !== 'READY') {
      throw new Error(`TENANT_DATABASE_NOT_READY:${organizationId}`);
    }

    const periodStart = periodKeyStart(periodKey);
    const tenantFacts = new Map<string, number>();

    const db = await this.manager.getClient(registry as never);
    tenantFacts.set(
      'orders_per_month',
      await db.order.count({ where: { createdAt: { gte: periodStart } } }),
    );
    tenantFacts.set(
      'products_max',
      await db.product.count({ where: { status: { not: 'ARCHIVED' } } }),
    );

    tenantFacts.set(
      'staff_seats',
      await this.platform.client.organizationMember.count({
        where: { organizationId, isActive: true },
      }),
    );

    const entries: UsageReconciliationEntry[] = [];
    let drifted = 0;
    for (const definition of USAGE_METRICS) {
      const counted = tenantFacts.get(definition.key) ?? 0;
      const recorded = await this.usage.getValue(organizationId, definition.key, periodKey);
      const matches = recorded === BigInt(counted);
      if (!matches) {
        drifted += 1;
        TenantMetrics.increment('usage_reconciliation_drift', {
          metric: definition.key,
          organizationId,
        });
        this.logger.warn('usage_reconciliation_drift', {
          organizationId,
          metric: definition.key,
          counted,
          recorded: recorded.toString(),
        });
        await this.usage.setValue(organizationId, definition.key, BigInt(counted), periodKey);
      }
      entries.push({
        metric: definition.key,
        source: definition.key === 'staff_seats' ? 'control_plane' : 'tenant_db',
        counted,
        recorded: recorded.toString(),
        corrected: !matches,
      });
    }

    return { organizationId, periodKey, entries, drifted };
  }

  /** Reconcile every READY tenant; one failure never blocks the fleet. */
  async reconcileAllReady(
    periodKey = currentPeriodKey(),
  ): Promise<{ reconciled: number; failures: Array<{ organizationId: string; error: string }> }> {
    const registries = await this.platform.client.tenantDatabase.findMany({
      where: { status: 'READY' },
      select: { organizationId: true },
      orderBy: { organizationId: 'asc' },
    });
    const failures: Array<{ organizationId: string; error: string }> = [];
    let reconciled = 0;
    for (const registry of registries) {
      try {
        await this.reconcileOrganization(registry.organizationId, periodKey);
        reconciled += 1;
      } catch (error) {
        failures.push({
          organizationId: registry.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { reconciled, failures };
  }

  /** Convenience passthrough used by callers inside resolved contexts. */
  async reconcileCurrentTenant(periodKey = currentPeriodKey()) {
    const context = tryGetTenantContext();
    if (!context) throw new Error('TENANT_CONTEXT_REQUIRED');
    return this.reconcileOrganization(context.organizationId, periodKey);
  }
}
