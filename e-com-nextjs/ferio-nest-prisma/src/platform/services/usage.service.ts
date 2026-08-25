import { Injectable } from '@nestjs/common';
import { StructuredLogger, TenantMetrics } from '@app/common';
import type { PlatformPrismaService } from '../platform-prisma.service';
import { getUsageMetric } from './usage-metrics.registry';

export function currentPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class UsageService {
  private readonly logger = new StructuredLogger(UsageService.name);

  constructor(private readonly platform: PlatformPrismaService) {}

  /**
   * Atomic idempotent-shaped upsert: concurrent increments cannot lose counts.
   *
   * MT-9 §9.4: for registry metrics with a plan limit, crossing the warning
   * threshold is detected exactly once per period (boundary arithmetic on the
   * post-upsert value) and surfaced as a structured warn + metric counter.
   */
  async increment(
    organizationId: string,
    metric: string,
    delta = 1,
    periodKey = currentPeriodKey(),
  ): Promise<bigint> {
    const row = await this.platform.client.usageCounter.upsert({
      where: {
        organizationId_metric_periodKey: { organizationId, metric, periodKey },
      },
      create: { organizationId, metric, periodKey, value: BigInt(delta) },
      update: { value: { increment: BigInt(delta) } },
    });
    await this.warnOnThresholdCrossing(
      organizationId,
      metric,
      row.value - BigInt(delta),
      row.value,
    );
    return row.value;
  }

  /** Authoritative correction — reconciliation writes facts, not deltas. */
  async setValue(
    organizationId: string,
    metric: string,
    value: bigint | number,
    periodKey = currentPeriodKey(),
  ): Promise<bigint> {
    const normalized =
      typeof value === 'bigint' ? value : BigInt(Math.max(0, Math.trunc(value)));
    const row = await this.platform.client.usageCounter.upsert({
      where: {
        organizationId_metric_periodKey: { organizationId, metric, periodKey },
      },
      create: { organizationId, metric, periodKey, value: normalized },
      update: { value: normalized },
    });
    return row.value;
  }

  async getValue(organizationId: string, metric: string, periodKey = currentPeriodKey()) {
    const row = await this.platform.client.usageCounter.findUnique({
      where: {
        organizationId_metric_periodKey: { organizationId, metric, periodKey },
      },
    });
    return row?.value ?? BigInt(0);
  }

  async snapshot(organizationId: string, metrics: string[], periodKey = currentPeriodKey()) {
    const rows = await this.platform.client.usageCounter.findMany({
      where: { organizationId, periodKey, metric: { in: metrics } },
    });
    return Object.fromEntries(rows.map((row) => [row.metric, row.value.toString()]));
  }

  /**
   * Fires only when the increment crosses the configured fraction of the
   * plan limit — never before, never again while above it.
   */
  private async warnOnThresholdCrossing(
    organizationId: string,
    metric: string,
    previous: bigint,
    current: bigint,
  ): Promise<void> {
    const definition = getUsageMetric(metric);
    if (!definition || definition.warningThreshold <= 0) return;

    try {
      const subscription = await this.platform.client.subscription.findUnique({
        where: { organizationId },
        include: { plan: { include: { entitlements: true } } },
      });
      const entitlement = subscription?.plan.entitlements.find(
        (item: { featureKey: string }) => item.featureKey === metric,
      );
      if (
        !entitlement ||
        !entitlement.enabled ||
        entitlement.limit === null ||
        entitlement.limit === undefined
      ) {
        return;
      }
      const thresholdValue = BigInt(
        Math.floor(entitlement.limit * definition.warningThreshold),
      );
      if (thresholdValue <= BigInt(0)) return;
      if (previous >= thresholdValue || current < thresholdValue) return;

      TenantMetrics.increment('usage_threshold_crossed', {
        metric,
        organizationId,
      });
      this.logger.warn('usage_warning_threshold_crossed', {
        organizationId,
        metric,
        limit: entitlement.limit,
        thresholdPercent: Math.round(definition.warningThreshold * 100),
        currentUsage: current.toString(),
      });
    } catch (error) {
      // Metering warnings must never fail the business write that triggered
      // them.
      this.logger.error(
        'usage_threshold_check_failed',
        error instanceof Error ? error : new Error(String(error)),
        { organizationId, metric },
      );
    }
  }
}
