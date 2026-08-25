import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@app/common';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { TenantDatabaseManager } from './tenant-database.manager';

export interface RetentionRuleResult {
  model: string;
  days: number;
  deleted: number;
  /** false when the rule is disabled (days <= 0) */
  enabled: boolean;
}

export interface RetentionSweepReport {
  organizationId: string;
  results: RetentionRuleResult[];
  totalDeleted: number;
}

interface TenantClient {
  commerceMessage: { deleteMany(args: unknown): Promise<{ count: number }> };
  storefrontAnalyticsEvent: { deleteMany(args: unknown): Promise<{ count: number }> };
  deliveryLocationHistory: { deleteMany(args: unknown): Promise<{ count: number }> };
  auditLog: { deleteMany(args: unknown): Promise<{ count: number }> };
}

function envDays(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * MT-12/§16.3 — per-tenant data retention sweeps.
 *
 * Database-per-tenant makes blast radius small, but disk still grows
 * forever without pruning. Each rule deletes by createdAt cutoff; a rule
 * with days <= 0 (or unset) is disabled — AuditLog defaults OFF pending the
 * legal retention decision.
 */
@Injectable()
export class RetentionSweepService {
  private readonly logger = new StructuredLogger(RetentionSweepService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly manager: TenantDatabaseManager,
  ) {}

  private rules(now = new Date()): Array<{
    model: keyof TenantClient;
    label: string;
    days: number;
    cutoff: Date;
  }> {
    return [
      {
        model: 'commerceMessage',
        label: 'CommerceMessage',
        days: envDays('RETENTION_COMMERCE_MESSAGE_DAYS', 180),
        cutoff: new Date(
          now.getTime() - envDays('RETENTION_COMMERCE_MESSAGE_DAYS', 180) * 86_400_000,
        ),
      },
      {
        model: 'storefrontAnalyticsEvent',
        label: 'StorefrontAnalyticsEvent',
        days: envDays('RETENTION_STOREFRONT_ANALYTICS_DAYS', 365),
        cutoff: new Date(
          now.getTime() -
            envDays('RETENTION_STOREFRONT_ANALYTICS_DAYS', 365) * 86_400_000,
        ),
      },
      {
        model: 'deliveryLocationHistory',
        label: 'DeliveryLocationHistory',
        days: envDays('RETENTION_GPS_DAYS', 90),
        cutoff: new Date(
          now.getTime() - envDays('RETENTION_GPS_DAYS', 90) * 86_400_000,
        ),
      },
      {
        model: 'auditLog',
        label: 'AuditLog',
        days: envDays('RETENTION_AUDIT_LOG_DAYS', 0),
        cutoff: new Date(now.getTime() - 0),
      },
    ];
  }

  async sweepTenant(
    organizationId: string,
    now = new Date(),
  ): Promise<RetentionSweepReport> {
    const registry = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
    });
    if (!registry || registry.status !== 'READY') {
      throw new Error(`TENANT_DATABASE_NOT_READY:${organizationId}`);
    }

    const db = (await this.manager.getClient(registry as never)) as unknown as TenantClient;
    const results: RetentionRuleResult[] = [];
    for (const rule of this.rules(now)) {
      if (rule.days <= 0) {
        results.push({ model: rule.label, days: rule.days, deleted: 0, enabled: false });
        continue;
      }
      const { count } = await db[rule.model].deleteMany({
        where: { createdAt: { lt: rule.cutoff } },
      });
      results.push({ model: rule.label, days: rule.days, deleted: count, enabled: true });
      if (count > 0) {
        this.logger.log('retention_pruned', {
          organizationId,
          model: rule.label,
          olderThanDays: rule.days,
          deleted: count,
        });
      }
    }

    return {
      organizationId,
      results,
      totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
    };
  }

  /**
   * Sweep every READY tenant. One failing tenant never blocks the rest —
   * same isolation contract as every other fan-out.
   */
  async sweepAllReady(): Promise<{
    swept: number;
    failures: Array<{ organizationId: string; error: string }>;
    totalDeleted: number;
  }> {
    const registries = await this.platform.client.tenantDatabase.findMany({
      where: { status: 'READY' },
      select: { organizationId: true },
      orderBy: { organizationId: 'asc' },
    });
    const failures: Array<{ organizationId: string; error: string }> = [];
    let swept = 0;
    let totalDeleted = 0;
    for (const registry of registries) {
      try {
        const report = await this.sweepTenant(registry.organizationId);
        swept += 1;
        totalDeleted += report.totalDeleted;
      } catch (error) {
        failures.push({
          organizationId: registry.organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { swept, failures, totalDeleted };
  }
}
