import { Injectable } from '@nestjs/common';
import type { PlatformPrismaService } from '../platform-prisma.service';

export function currentPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class UsageService {
  constructor(private readonly platform: PlatformPrismaService) {}

  /** Atomic idempotent-shaped upsert: concurrent increments cannot lose counts. */
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
}
