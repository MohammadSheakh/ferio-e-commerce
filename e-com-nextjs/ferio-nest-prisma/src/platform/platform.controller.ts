import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { PlansService } from './services/plans.service';
import type { CreatePlanInput } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { ProvisioningService } from './services/provisioning.service';
import { SupportAccessService } from './services/support-access.service';
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
