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
  batches: number;
  truncated: boolean;
  durationMs: number;
}

export interface RetentionSweepReport {
  organizationId: string;
  results: RetentionRuleResult[];
  totalDeleted: number;
}

interface RetentionDelegate {
  findMany(args: unknown): Promise<Array<{ id: string }>>;
  deleteMany(args: unknown): Promise<{ count: number }>;
}

type RetentionModel =
  | 'commerceMessage'
  | 'storefrontAnalyticsEvent'
  | 'deliveryLocationHistory'
  | 'auditLog';

type TenantDatabaseMaterial = Parameters<TenantDatabaseManager['getClient']>[0];

function envDays(key: string, fallback: number): number {
  const value = Number(process.env[key] ?? fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function boundedInteger(
  key: string,
  fallback: number,
  maximum: number,
): number {
  const value = Number(process.env[key] ?? fallback);
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;
}

/**
 * MT-12/§16.3 — per-tenant data retention sweeps.
 *
 * Database-per-tenant makes blast radius small, but disk still grows
 * forever without pruning. Each rule deletes by createdAt cutoff; an explicit
 * value <= 0 disables the rule. AuditLog defaults to the approved seven-year
 * retention period.
 */
@Injectable()
export class RetentionSweepService {
  private readonly logger = new StructuredLogger(RetentionSweepService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly manager: TenantDatabaseManager,
  ) {}

  private rules(now = new Date()): Array<{
    model: RetentionModel;
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
          now.getTime() -
            envDays('RETENTION_COMMERCE_MESSAGE_DAYS', 180) * 86_400_000,
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
        // Owner decision #9: security/financial audit records are kept for
        // 7 years unless a later legal review changes the period.
        days: envDays('RETENTION_AUDIT_LOG_DAYS', 2_555),
        cutoff: new Date(
          now.getTime() -
            envDays('RETENTION_AUDIT_LOG_DAYS', 2_555) * 86_400_000,
        ),
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

    const material: TenantDatabaseMaterial = registry;
    return this.manager.runTransient(material, async () => {
      const db = await this.manager.getClient(material);
      const results: RetentionRuleResult[] = [];
      for (const rule of this.rules(now)) {
        if (rule.days <= 0) {
          results.push({
            model: rule.label,
            days: rule.days,
            deleted: 0,
            enabled: false,
            batches: 0,
            truncated: false,
            durationMs: 0,
          });
          continue;
        }
        const result = await this.deleteInBatches(
          db[rule.model],
          rule.label,
          rule.days,
          rule.cutoff,
        );
        results.push(result);
        if (result.deleted > 0) {
          this.logger.log('retention_pruned', {
            organizationId,
            model: rule.label,
            olderThanDays: rule.days,
            deleted: result.deleted,
            batches: result.batches,
            truncated: result.truncated,
            durationMs: result.durationMs,
          });
        }
        if (result.truncated) {
          this.logger.warn('retention_backlog_deferred', {
            organizationId,
            model: rule.label,
            deleted: result.deleted,
            rowBudget: boundedInteger(
              'RETENTION_MAX_ROWS_PER_RULE',
              10_000,
              100_000,
            ),
          });
        }
      }

      return {
        organizationId,
        results,
        totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
      };
    });
  }

  private async deleteInBatches(
    delegate: RetentionDelegate,
    label: string,
    days: number,
    cutoff: Date,
  ): Promise<RetentionRuleResult> {
    const startedAt = Date.now();
    const batchSize = boundedInteger('RETENTION_DELETE_BATCH_SIZE', 500, 5_000);
    const rowBudget = boundedInteger(
      'RETENTION_MAX_ROWS_PER_RULE',
      10_000,
      100_000,
    );
    let deleted = 0;
    let batches = 0;

    while (deleted < rowBudget) {
      const take = Math.min(batchSize, rowBudget - deleted);
      const candidates = await delegate.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take,
      });
      if (candidates.length === 0) break;

      const { count } = await delegate.deleteMany({
        where: {
          id: { in: candidates.map(({ id }) => id) },
          // Recheck eligibility so a concurrent update cannot delete a record
          // that moved back inside its retention window after selection.
          createdAt: { lt: cutoff },
        },
      });
      deleted += count;
      batches += 1;
      if (count === 0 || candidates.length < take) break;
    }

    const backlog =
      deleted >= rowBudget
        ? await delegate.findMany({
            where: { createdAt: { lt: cutoff } },
            select: { id: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 1,
          })
        : [];

    return {
      model: label,
      days,
      deleted,
      enabled: true,
      batches,
      truncated: backlog.length > 0,
      durationMs: Date.now() - startedAt,
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
