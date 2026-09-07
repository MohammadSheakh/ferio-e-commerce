import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { ProvisioningService } from './services/provisioning.service';
import { TenantClosureService } from './services/tenant-closure.service';
import { SupportAccessService } from './services/support-access.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { PlatformPrismaService } from './platform-prisma.service';
import { UsageService, currentPeriodKey } from './services/usage.service';
import {
  USAGE_METRICS,
  usageMetricKeys,
} from './services/usage-metrics.registry';
import { UsageReconciliationService } from '../tenancy/services/usage-reconciliation.service';
import { RetentionSweepService } from '../tenancy/services/retention-sweep.service';
import { TenantSchemaBootstrapper } from '../tenancy/services/tenant-schema.bootstrapper';
import {
  PlatformAuthGuard,
  PLATFORM_PERMISSION,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { PlatformRequest } from './platform-request.type';
import {
  CreateOrganizationDto,
  FinalizeClosureDto,
  InitiateClosureDto,
  ProvisionOrganizationDto,
  TransitionOrganizationDto,
} from './dto/organization.dto';

/**
 * Minimal Platform Admin API (MT-1 foundation). The full operational UI is
 * MT-9; these endpoints exist so provisioning/lifecycle flows can be driven
 * and integration-tested before any console exists.
 */
@Controller('platform')
@UseGuards(ThrottlerGuard, PlatformAuthGuard)
@Throttle({ platform: { limit: 300, ttl: 60_000 } })
export class PlatformAdminController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly domains: DomainsService,
    private readonly provisioning: ProvisioningService,
    private readonly supportAccess: SupportAccessService,
    private readonly closure: TenantClosureService,
    private readonly platformPrisma: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
    private readonly usage: UsageService,
    private readonly usageReconciliation: UsageReconciliationService,
    private readonly retentionSweep: RetentionSweepService,
    private readonly tenantSchemaBootstrapper: TenantSchemaBootstrapper,
  ) {}

  @Post('organizations')
  @PlatformPermissions('organization:write')
  createOrganization(
    @Body() body: CreateOrganizationDto,
    @Req() request: PlatformRequest,
  ) {
    return this.organizations.create({
      name: body.name,
      slug: body.slug,
      ownerEmail: body.ownerEmail,
      actorId: request.platformPrincipal?.platformUserId,
    });
  }

  @Get('organizations')
  @PlatformPermissions('organization:read')
  listOrganizations() {
    return this.organizations.list();
  }

  private async organizationNames(): Promise<Map<string, string>> {
    const orgs = await this.platformPrisma.client.organization.findMany({
      select: { id: true, name: true },
    });
    return new Map(orgs.map((org) => [org.id, org.name]));
  }

  /** MT-9 §12.3 — subscription directory for the console billing views. */
  @Get('subscriptions')
  @PlatformPermissions('subscription:read')
  async listSubscriptions() {
    const rows = await this.platformPrisma.client.subscription.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true, slug: true, status: true } },
        plan: { select: { key: true, displayName: true } },
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        organizationName: row.organization?.name ?? '—',
        organizationSlug: row.organization?.slug ?? '—',
        planKey: row.plan?.key ?? '—',
        planName: row.plan?.displayName ?? '—',
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      })),
    };
  }

  /** MT-9 §12.3 — platform invoices with payment outcome at a glance. */
  @Get('billing/invoices')
  @PlatformPermissions('saas_billing:read')
  async listInvoices() {
    const [rows, orgNames] = await Promise.all([
      this.platformPrisma.client.saasInvoice.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      this.organizationNames(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        number: row.number,
        organizationName: orgNames.get(row.organizationId) ?? '—',
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        amountMinor: row.amountMinor,
        currency: row.currency,
        paid: row.paid,
        createdAt: row.createdAt,
      })),
    };
  }

  /** MT-9 §12.3 — provider payment attempts (initiated/succeeded/failed). */
  @Get('billing/payment-attempts')
  @PlatformPermissions('saas_billing:read')
  async listPaymentAttempts() {
    const rows = await this.platformPrisma.client.saasPaymentAttempt.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { number: true } } },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice?.number ?? '—',
        provider: row.provider,
        reference: row.reference,
        status: row.status,
        amountMinor: row.amountMinor,
        createdAt: row.createdAt,
      })),
    };
  }

  /**
   * MT-9 §12.1/§12.4 — fleet schema health: every registered tenant
   * database vs the canonical migration chain head.
   */
  @Get('database-health')
  @PlatformPermissions(PLATFORM_PERMISSION.PLATFORM_HEALTH_READ)
  async databaseHealth() {
    const migrations = this.tenantSchemaBootstrapper.listMigrations();
    const canonicalHead = migrations.at(-1) ?? null;
    const rows = await this.platformPrisma.client.tenantDatabase.findMany({
      orderBy: { createdAt: 'asc' },
      include: { organization: { select: { name: true, status: true } } },
    });
    const databases = rows.map((row) => ({
      tenantDatabaseId: row.id,
      organizationName: row.organization?.name ?? '—',
      organizationStatus: row.organization?.status ?? '—',
      dbStatus: row.status,
      schemaVersion: row.schemaVersion,
      upToDate: canonicalHead ? row.schemaVersion === canonicalHead : true,
    }));
    return {
      canonicalHead,
      totalDatabases: databases.length,
      upToDateCount: databases.filter((db) => db.upToDate).length,
      databases,
    };
  }

  /** MT-9 §12.1/§12.4 — credential-free domain routing diagnostics. */
  @Get('domain-health')
  @PlatformPermissions(PLATFORM_PERMISSION.PLATFORM_HEALTH_READ)
  domainHealth() {
    return this.domains.health();
  }

  @Get('organizations/:id')
  @PlatformPermissions('organization:read')
  getOrganization(@Param('id') id: string) {
    return this.organizations.getById(id);
  }

  /**
   * MT-9 §9.4 — Platform Admin usage view: recorded counters for every
   * authoritative metric against the current plan's limits, with warning
   * flags at the registry thresholds. Pure control-plane read.
   */
  @Get('organizations/:id/usage')
  @PlatformPermissions('organization:read')
  async getOrganizationUsage(
    @Param('id') id: string,
    @Query('periodKey') periodKey?: string,
  ) {
    const key = periodKey || currentPeriodKey();
    const [subscription, counters] = await Promise.all([
      this.platformPrisma.client.subscription.findUnique({
        where: { organizationId: id },
        include: { plan: { include: { entitlements: true } } },
      }),
      this.usage.snapshot(id, usageMetricKeys(), key),
    ]);
    const entitlements = new Map(
      (subscription?.plan.entitlements ?? []).map(
        (item) => [item.featureKey, item] as const,
      ),
    );
    const metrics = USAGE_METRICS.map((definition) => {
      const entitlement = entitlements.get(definition.key) as
        | { enabled: boolean; limit: number | null }
        | undefined;
      const recorded = counters[definition.key] ?? '0';
      const limit = entitlement?.limit ?? null;
      const warningThresholdValue =
        limit !== null ? Math.floor(limit * definition.warningThreshold) : null;
      return {
        metric: definition.key,
        label: definition.label,
        aggregation: definition.aggregation,
        reset: definition.reset,
        recorded,
        enabled: entitlement?.enabled ?? false,
        limit,
        usageRatio:
          limit && Number(limit) > 0 ? Number(recorded) / Number(limit) : null,
        warning:
          warningThresholdValue !== null &&
          entitlement?.enabled === true &&
          Number(recorded) >= warningThresholdValue,
      };
    });
    return { organizationId: id, periodKey: key, metrics };
  }

  /**
   * MT-9 §9.4 — recount authoritative facts for one tenant and correct any
   * drifted counters. Audited; returns the drift report.
   */
  @Post('organizations/:id/usage/reconcile')
  @PlatformPermissions('organization:write')
  async reconcileOrganizationUsage(
    @Param('id') id: string,
    @Req() request: PlatformRequest,
  ) {
    const report = await this.usageReconciliation.reconcileOrganization(id);
    await this.audit.record({
      action: 'USAGE_RECONCILED',
      entityType: 'UsageCounter',
      entityId: id,
      actorId:
        request?.user?.platformUserId ?? request?.user?.userId ?? 'platform',
      newValue: { drifted: report.drifted, entries: report.entries },
      metadata: { periodKey: report.periodKey },
    });
    return report;
  }

  /**
   * MT-12 §15 / brutal-audit #7 — run a retention sweep across every READY
   * tenant now (the daily scheduler also fires this). Audited; returns
   * per-rule deletion counts so operators can see what was pruned.
   */
  @Post('maintenance/retention-sweep')
  @PlatformPermissions('organization:write')
  async runRetentionSweep(@Req() request: PlatformRequest) {
    const result = await this.retentionSweep.sweepAllReady();
    await this.audit.record({
      action: 'RETENTION_SWEEP',
      entityType: 'TenantDatabase',
      actorId:
        request?.user?.platformUserId ?? request?.user?.userId ?? 'platform',
      newValue: {
        swept: result.swept,
        totalDeleted: result.totalDeleted,
        failures: result.failures,
      },
    });
    return result;
  }

  @Patch('organizations/:id/status')
  @PlatformPermissions('organization:write')
  transitionOrganization(
    @Param('id') id: string,
    @Body() body: TransitionOrganizationDto,
    @Req() request: PlatformRequest,
  ) {
    return this.organizations.transition(id, body.status, {
      actorId: request.platformPrincipal?.platformUserId,
      reason: body.reason,
    });
  }

  @Post('organizations/:id/provision')
  @PlatformPermissions('provisioning:run')
  provision(
    @Param('id') id: string,
    @Body() body: ProvisionOrganizationDto,
    @Req() request: PlatformRequest,
  ) {
    return this.provisioning.start(id, {
      actorId: request.platformPrincipal?.platformUserId,
      idempotencyKey: body.idempotencyKey,
    });
  }

  /**
   * MT-9 §12.1 — platform dashboard aggregates. Metadata only; no tenant PII.
   */
  @Get('dashboard')
  @PlatformPermissions('organization:read')
  async dashboard() {
    const [
      orgLifecycle,
      subsByStatus,
      dbsByStatus,
      provisioningFailed,
      activeGrants,
    ] = await Promise.all([
      this.platformPrisma.client.organization.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.platformPrisma.client.subscription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.platformPrisma.client.tenantDatabase.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.platformPrisma.client.provisioningRun.count({
        where: { status: 'FAILED' },
      }),
      this.supportAccess.countActive(),
    ]);
    const toMap = (rows: Array<{ status: string; _count: { _all: number } }>) =>
      Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
    return {
      organizations: toMap(orgLifecycle),
      subscriptions: toMap(subsByStatus),
      tenantDatabases: toMap(dbsByStatus),
      provisioningFailures: provisioningFailed,
      activeSupportGrants: activeGrants,
    };
  }

  @Get('organizations/:id/provisioning-runs')
  @PlatformPermissions('provisioning:run', 'organization:read')
  provisioningTimeline(@Param('id') id: string) {
    return this.platformPrisma.client.provisioningRun.findMany({
      where: { organizationId: id },
      include: { steps: { orderBy: { id: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Post('organizations/:id/closure/initiate')
  @PlatformPermissions('organization:write')
  initiateClosure(
    @Param('id') id: string,
    @Body() body: InitiateClosureDto,
    @Req() request: PlatformRequest,
  ) {
    return this.closure.initiateClosure(id, {
      actorId: request.platformPrincipal?.platformUserId,
      reason: body.reason,
    });
  }

  @Post('organizations/:id/closure/finalize')
  @PlatformPermissions('organization:write')
  finalizeClosure(
    @Param('id') id: string,
    @Body() body: FinalizeClosureDto,
    @Req() request: PlatformRequest,
  ) {
    return this.closure.finalizeClosure(id, {
      actorId: request.platformPrincipal?.platformUserId,
      retentionAcknowledged: body.retentionAcknowledged === true,
      overrideRetentionPeriod: body.overrideRetentionPeriod === true,
    });
  }
}
