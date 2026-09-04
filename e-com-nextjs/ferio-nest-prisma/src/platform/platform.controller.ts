import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { PlansService } from './services/plans.service';
import type {
  CreatePlanInput,
  UpdatePlanInput,
} from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { ProvisioningService } from './services/provisioning.service';
import { MigrationOrchestratorService } from './services/migration-orchestrator.service';
import { TenantClosureService } from './services/tenant-closure.service';
import { SupportAccessService } from './services/support-access.service';
import { PlatformAuthService } from './services/platform-auth.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { PlatformPrismaService } from './platform-prisma.service';
import { UsageService, currentPeriodKey } from './services/usage.service';
import {
  USAGE_METRICS,
  usageMetricKeys,
} from './services/usage-metrics.registry';
import { UsageReconciliationService } from '../tenancy/usage-reconciliation.service';
import { RetentionSweepService } from '../tenancy/retention-sweep.service';
import { TenantSchemaBootstrapper } from '../tenancy/tenant-schema.bootstrapper';
import { JwtService } from '@nestjs/jwt';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

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
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly provisioning: ProvisioningService,
    private readonly supportAccess: SupportAccessService,
    private readonly migrations: MigrationOrchestratorService,
    private readonly closure: TenantClosureService,
    private readonly platformAuth: PlatformAuthService,
    private readonly jwt: JwtService,
    private readonly platformPrisma: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
    private readonly usage: UsageService,
    private readonly usageReconciliation: UsageReconciliationService,
    private readonly retentionSweep: RetentionSweepService,
  ) {}

  @Post('organizations')
  @PlatformPermissions('organization:write')
  createOrganization(
    @Body()
    body: { name: string; slug: string; ownerEmail: string },
    @Req() request: any,
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
    return new Map(orgs.map((org: any) => [org.id, org.name]));
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
      items: rows.map((row: any) => ({
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
      items: rows.map((row: any) => ({
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
    const orgNames = await this.organizationNames();
    return {
      items: rows.map((row: any) => ({
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
  @PlatformPermissions('organization:read')
  async databaseHealth() {
    const bootstrapper = new TenantSchemaBootstrapper();
    const migrations = bootstrapper.listMigrations();
    const canonicalHead = migrations.at(-1) ?? null;
    const rows = await this.platformPrisma.client.tenantDatabase.findMany({
      orderBy: { createdAt: 'asc' },
      include: { organization: { select: { name: true, status: true } } },
    });
    const databases = rows.map((row: any) => ({
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
      upToDateCount: databases.filter((db: any) => db.upToDate).length,
      databases,
    };
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
  async getOrganizationUsage(@Param('id') id: string, @Query('periodKey') periodKey?: string) {
    const key = periodKey || currentPeriodKey();
    const [subscription, counters] = await Promise.all([
      this.platformPrisma.client.subscription.findUnique({
        where: { organizationId: id },
        include: { plan: { include: { entitlements: true } } },
      }),
      this.usage.snapshot(id, usageMetricKeys(), key),
    ]);
    const entitlements = new Map(
      (subscription?.plan.entitlements ?? []).map((item: any) => [item.featureKey, item]),
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
        usageRatio: limit && Number(limit) > 0 ? Number(recorded) / Number(limit) : null,
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
  async reconcileOrganizationUsage(@Param('id') id: string, @Req() request: any) {
    const report = await this.usageReconciliation.reconcileOrganization(id);
    await this.audit.record({
      action: 'USAGE_RECONCILED',
      entityType: 'UsageCounter',
      entityId: id,
      actorId: request?.user?.platformUserId ?? request?.user?.userId ?? 'platform',
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
  async runRetentionSweep(@Req() request: any) {
    const result = await this.retentionSweep.sweepAllReady();
    await this.audit.record({
      action: 'RETENTION_SWEEP',
      entityType: 'TenantDatabase',
      actorId: request?.user?.platformUserId ?? request?.user?.userId ?? 'platform',
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
    @Body() body: { status: any; reason?: string },
    @Req() request: any,
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
    @Body() body: { idempotencyKey?: string },
    @Req() request: any,
  ) {
    return this.provisioning.start(id, {
      actorId: request.platformPrincipal?.platformUserId,
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Post('plans')
  @PlatformPermissions('subscription:write')
  createPlan(@Body() body: CreatePlanInput, @Req() request: any) {
    return this.plans.create({ ...body, actorId: request.platformPrincipal?.platformUserId });
  }

  @Patch('plans/:id')
  @PlatformPermissions('subscription:write')
  updatePlan(
    @Param('id') id: string,
    @Body() body: UpdatePlanInput,
    @Req() request: any,
  ) {
    return this.plans.update(id, {
      ...body,
      actorId: request.platformPrincipal?.platformUserId,
    });
  }

  @Get('plans')
  @PlatformPermissions('subscription:read')
  listPlans() {
    return this.plans.list();
  }

  @Post('organizations/:id/subscription/trial')
  @PlatformPermissions('subscription:write')
  startTrial(
    @Param('id') id: string,
    @Body() body: { planKey: string; trialDays?: number },
  ) {
    return this.subscriptions.startTrial(id, body.planKey, Math.min(body.trialDays ?? 14, 90));
  }

  @Patch('organizations/:id/subscription/status')
  @PlatformPermissions('subscription:write')
  transitionSubscription(
    @Param('id') id: string,
    @Body() body: { status: any; note?: string },
    @Req() request: any,
  ) {
    return this.subscriptions.transition(id, body.status, {
      actorId: request.platformPrincipal?.platformUserId,
      note: body.note,
    });
  }

  /**
   * MT-9 §12.1 — platform dashboard aggregates. Metadata only; no tenant PII.
   */
  @Get('dashboard')
  @PlatformPermissions('organization:read')
  async dashboard() {
    const [orgLifecycle, subsByStatus, dbsByStatus, provisioningFailed, activeGrants] =
      await Promise.all([
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

  @Post('auth/login')
  // Brute-force bound (FR-AUTH-005): 10 attempts / minute / IP on the most
  // privileged credential surface in the system.
  @Throttle({ platform: { limit: 10, ttl: 60_000 } })
  @PlatformPermissions() // public within the platform controller realm guard
  async login(
    @Body() body: { email?: string; password?: string },
  ) {
    if (!body.email || !body.password) {
      throw new (require('@nestjs/common').UnauthorizedException)(
        'PLATFORM_CREDENTIALS_INVALID',
      );
    }
    const principal = await this.platformAuth.verifyCredentials(
      body.email,
      body.password,
    );
    const token = await this.jwt.signAsync(
      {
        sub: principal.platformUserId,
        email: principal.email,
        roles: principal.roles,
        realm: 'platform',
      },
      { secret: process.env.PLATFORM_JWT_SECRET, expiresIn: '8h' },
    );
    await this.audit.record({
      action: 'PLATFORM_LOGIN',
      entityType: 'PlatformUser',
      entityId: principal.platformUserId,
      actorId: principal.platformUserId,
    });
    return { accessToken: token, roles: principal.roles };
  }

  @Post('migrations')
  @PlatformPermissions('migration:run')
  startMigration(
    @Body()
    body: {
      canaryOrganizationId?: string;
      concurrencyLimit?: number;
      failureThreshold?: number;
    },
    @Req() request: any,
  ) {
    return this.migrations.start({
      actorId: request.platformPrincipal?.platformUserId,
      canaryOrganizationId: body.canaryOrganizationId,
      concurrencyLimit: body.concurrencyLimit,
      failureThreshold: body.failureThreshold,
    });
  }

  @Get('migrations')
  @PlatformPermissions('migration:run')
  listMigrations() {
    return this.migrations.listRuns();
  }

  @Get('migrations/:runId')
  @PlatformPermissions('migration:run')
  getMigration(@Param('runId') runId: string) {
    return this.migrations.getRun(runId);
  }

  @Post('migrations/:runId/pause')
  @PlatformPermissions('migration:run')
  pauseMigration(@Param('runId') runId: string) {
    return this.migrations.pause(runId);
  }

  @Post('migrations/:runId/resume')
  @PlatformPermissions('migration:run')
  resumeMigration(@Param('runId') runId: string) {
    return this.migrations.resume(runId);
  }

  @Post('organizations/:id/closure/initiate')
  @PlatformPermissions('organization:write')
  initiateClosure(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() request: any,
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
    @Body() body: { retentionAcknowledged?: boolean; overrideRetentionPeriod?: boolean },
    @Req() request: any,
  ) {
    return this.closure.finalizeClosure(id, {
      actorId: request.platformPrincipal?.platformUserId,
      retentionAcknowledged: body.retentionAcknowledged === true,
      overrideRetentionPeriod: body.overrideRetentionPeriod === true,
    });
  }

  @Get('support-access')
  @PlatformPermissions('support_access:request')
  listSupportAccess(@Query('organizationId') organizationId?: string) {
    return this.supportAccess.listActive(organizationId);
  }

  @Post('support-access/:grantId/revoke')
  @PlatformPermissions('support_access:request')
  revokeSupportAccess(
    @Param('grantId') grantId: string,
    @Req() request: any,
  ) {
    return this.supportAccess.revoke(
      grantId,
      request.platformPrincipal?.platformUserId,
    );
  }

  @Post('support-access')
  @PlatformPermissions('support_access:request')
  requestSupportAccess(
    @Body()
    body: { organizationId: string; reason: string; ttlMinutes?: number; scope?: Record<string, unknown> },
    @Req() request: any,
  ) {
    const principal = request.platformPrincipal;
    return this.supportAccess.grant({
      organizationId: body.organizationId,
      platformUserId: principal.platformUserId,
      reason: body.reason,
      scope: body.scope,
      ttlMinutes: body.ttlMinutes,
      actorId: principal.platformUserId,
    });
  }
}
