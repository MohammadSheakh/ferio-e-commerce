import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { PlansService } from './services/plans.service';
import type { CreatePlanInput } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { ProvisioningService } from './services/provisioning.service';
import { MigrationOrchestratorService } from './services/migration-orchestrator.service';
import { SupportAccessService } from './services/support-access.service';
import { PlatformAuthService } from './services/platform-auth.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { JwtService } from '@nestjs/jwt';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';

/**
 * Minimal Platform Admin API (MT-1 foundation). The full operational UI is
 * MT-9; these endpoints exist so provisioning/lifecycle flows can be driven
 * and integration-tested before any console exists.
 */
@Controller('platform')
@UseGuards(PlatformAuthGuard)
export class PlatformAdminController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly domains: DomainsService,
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly provisioning: ProvisioningService,
    private readonly supportAccess: SupportAccessService,
    private readonly migrations: MigrationOrchestratorService,
    private readonly platformAuth: PlatformAuthService,
    private readonly jwt: JwtService,
    private readonly platformPrisma: import('./platform-prisma.service').PlatformPrismaService,
    private readonly audit: PlatformAuditService,
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

  @Get('organizations/:id')
  @PlatformPermissions('organization:read')
  getOrganization(@Param('id') id: string) {
    return this.organizations.getById(id);
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
