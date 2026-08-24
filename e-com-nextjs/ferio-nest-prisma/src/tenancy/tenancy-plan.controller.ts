import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type UserPayload } from '@app/common';
import type { Request } from 'express';
import {
  TenantMembershipService,
  TenantMembershipGuard,
} from './tenant-membership.guard';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { EntitlementsService } from '../platform/services/entitlements.service';
import { UsageService } from '../platform/services/usage.service';

export interface TenantPlanStatusPayload {
  code: 'LEGACY' | 'ACTIVE' | 'TENANT_MEMBERSHIP_REQUIRED';
  plan?: { key: string; displayName: string };
  subscription?: { status: string; currentPeriodEnd?: string };
  usage?: Record<string, string>;
  limits?: Record<string, number>;
  domains?: Array<{ hostname: string; status: string; isPrimary: boolean }>;
}

/**
 * The tenant admin's own view of its SaaS relationship (MT-10 §13.1/13.2):
 * current plan, usage against limits, and domain state. Requires an
 * authenticated staff session bound to the resolved organization's roster.
 * Legacy deployments receive a LEGACY payload and render nothing.
 */
@ApiTags('Tenancy')
@ApiBearerAuth()
@Controller('tenancy')
export class TenancyPlanController {
  constructor(
    private readonly memberships: TenantMembershipService,
    private readonly platform: PlatformPrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
  ) {}

  @Get('my-plan')
  @UseGuards(AuthGuard)
  async myPlan(@Req() request: Request & { user?: UserPayload }): Promise<TenantPlanStatusPayload> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      return { code: 'LEGACY' };
    }
    const ctx = this.context();
    if (!ctx) return { code: 'LEGACY' };

    const email = String(request.user?.email ?? '').toLowerCase();
    const membership = await this.memberships.findActive(ctx.organizationId, email);
    if (!membership) return { code: 'TENANT_MEMBERSHIP_REQUIRED' };

    const [subscription, domains, usage] = await Promise.all([
      this.platform.client.subscription.findUnique({
        where: { organizationId: ctx.organizationId },
        include: { plan: { include: { entitlements: true } } },
      }),
      this.platform.client.tenantDomain.findMany({
        where: { organizationId: ctx.organizationId, status: 'ACTIVE' },
        select: { hostname: true, status: true, isPrimary: true },
      }),
      this.usage.snapshot(ctx.organizationId, ['orders_per_month', 'products_max']),
    ]);

    if (!subscription) return { code: 'LEGACY' };

    const limits: Record<string, number> = {};
    for (const entitlement of subscription.plan.entitlements) {
      if (entitlement.limit != null) limits[entitlement.featureKey] = entitlement.limit;
    }

    return {
      code: 'ACTIVE',
      plan: {
        key: subscription.plan.key,
        displayName: subscription.plan.displayName,
      },
      subscription: {
        status: subscription.status,
        ...(subscription.currentPeriodEnd
          ? { currentPeriodEnd: subscription.currentPeriodEnd.toISOString() }
          : {}),
      },
      usage,
      limits,
      domains,
    };
  }

  private context() {
    // Imported lazily to keep this controller's dependency surface tiny.
    const { tryGetTenantContext } = require('./tenant-context') as typeof import('./tenant-context');
    return tryGetTenantContext();
  }
}
