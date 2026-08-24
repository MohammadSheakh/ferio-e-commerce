import { Injectable } from '@nestjs/common';
import type { PlatformPrismaService } from '../platform-prisma.service';

export interface EntitlementDecision {
  allowed: boolean;
  /** Stable machine code for denial reasons (ADR-0006). */
  code?: 'ENTITLEMENT_NOT_FOUND' | 'FEATURE_DISABLED' | 'PLAN_LIMIT_REACHED' | 'SUBSCRIPTION_INACTIVE';
  limit?: number | null;
  currentUsage?: string;
}

export interface UsageReader {
  getValue(organizationId: string, metric: string, periodKey?: string): Promise<bigint>;
}

/**
 * Single evaluation point for plan features and usage limits (ADR-0006).
 * Services must call this before executing gated business logic; frontend
 * hiding of controls is never enforcement.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly usage: UsageReader,
  ) {}

  async evaluate(
    organizationId: string,
    featureKey: string,
    options: { requestedCount?: number; periodKey?: string; currentOverride?: number } = {},
  ): Promise<EntitlementDecision> {
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
      include: { plan: { include: { entitlements: true } } },
    });
    if (!subscription) {
      return { allowed: false, code: 'ENTITLEMENT_NOT_FOUND' };
    }
    if (!['TRIALING', 'ACTIVE'].includes(subscription.status)) {
      return { allowed: false, code: 'SUBSCRIPTION_INACTIVE' };
    }

    const entitlement = subscription.plan.entitlements.find((e) => e.featureKey === featureKey);
    if (!entitlement) {
      return { allowed: false, code: 'FEATURE_DISABLED' };
    }
    if (!entitlement.enabled) {
      return { allowed: false, code: 'FEATURE_DISABLED' };
    }
    if (entitlement.limit === null || entitlement.limit === undefined) {
      return { allowed: true };
    }

    const requested = options.requestedCount ?? 1;
    const current =
      options.currentOverride !== undefined
        ? BigInt(options.currentOverride)
        : await this.usage.getValue(organizationId, featureKey, options.periodKey);
    if (Number(current) + requested > entitlement.limit) {
      return {
        allowed: false,
        code: 'PLAN_LIMIT_REACHED',
        limit: entitlement.limit,
        currentUsage: current.toString(),
      };
    }
    return { allowed: true, limit: entitlement.limit, currentUsage: current.toString() };
  }

  /** Boolean convenience for non-limit features. */
  async isEnabled(organizationId: string, featureKey: string): Promise<boolean> {
    const decision = await this.evaluate(organizationId, featureKey);
    return decision.allowed;
  }
}
