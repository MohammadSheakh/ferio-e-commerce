import { Inject, Injectable } from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { TenantMetrics } from '@app/common';
import {
  PLATFORM_FEATURES,
  type PlatformFeatureKey,
} from '../constants/platform-features.constant';

export interface EntitlementDecision {
  allowed: boolean;
  /** Stable machine code for denial reasons (ADR-0006). */
  code?:
    | 'ENTITLEMENT_NOT_FOUND'
    | 'FEATURE_DISABLED'
    | 'PLAN_LIMIT_REACHED'
    | 'SUBSCRIPTION_INACTIVE';
  limit?: number | null;
  currentUsage?: string;
}

export interface EffectiveEntitlementItem {
  featureKey: string;
  displayName: string;
  category: 'CORE' | 'SELECTIVE' | 'EXPANSION';
  description: string;
  enabled: boolean;
  limit?: number | null;
  source: 'PLAN' | 'OVERRIDE' | 'DEFAULT';
  overrideId?: string;
  expiresAt?: string;
  reason?: string;
}

export const USAGE_READER = 'USAGE_READER';

export interface UsageReader {
  getValue(
    organizationId: string,
    metric: string,
    periodKey?: string,
  ): Promise<bigint>;
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
    @Inject(USAGE_READER)
    private readonly usage: UsageReader,
  ) {}

  async evaluate(
    organizationId: string,
    featureKey: string,
    options: {
      requestedCount?: number;
      periodKey?: string;
      currentOverride?: number;
    } = {},
  ): Promise<EntitlementDecision> {
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: { include: { entitlements: true } },
        entitlementOverrides: true,
      },
    });
    if (!subscription) {
      TenantMetrics.increment('entitlement_denied', {
        code: 'ENTITLEMENT_NOT_FOUND',
        featureKey,
      });
      return { allowed: false, code: 'ENTITLEMENT_NOT_FOUND' };
    }
    if (!['TRIALING', 'ACTIVE'].includes(subscription.status)) {
      TenantMetrics.increment('entitlement_denied', {
        code: 'SUBSCRIPTION_INACTIVE',
        featureKey,
      });
      return { allowed: false, code: 'SUBSCRIPTION_INACTIVE' };
    }

    const override = subscription.entitlementOverrides.find(
      (candidate) =>
        candidate.featureKey === featureKey &&
        candidate.revokedAt === null &&
        candidate.expiresAt > new Date(),
    );
    const entitlement =
      override ??
      subscription.plan.entitlements.find((e) => e.featureKey === featureKey);
    if (!entitlement) {
      TenantMetrics.increment('entitlement_denied', {
        code: 'FEATURE_DISABLED',
        featureKey,
      });
      return { allowed: false, code: 'FEATURE_DISABLED' };
    }
    if (!entitlement.enabled) {
      TenantMetrics.increment('entitlement_denied', {
        code: 'FEATURE_DISABLED',
        featureKey,
      });
      return { allowed: false, code: 'FEATURE_DISABLED' };
    }
    if (entitlement.limit === null || entitlement.limit === undefined) {
      return { allowed: true };
    }

    const requested = options.requestedCount ?? 1;
    if (!Number.isSafeInteger(requested) || requested < 0) {
      throw new RangeError(
        'requestedCount must be a non-negative safe integer',
      );
    }
    const current =
      options.currentOverride !== undefined
        ? BigInt(options.currentOverride)
        : await this.usage.getValue(
            organizationId,
            featureKey,
            options.periodKey,
          );
    if (current + BigInt(requested) > BigInt(entitlement.limit)) {
      TenantMetrics.increment('entitlement_denied', {
        code: 'PLAN_LIMIT_REACHED',
        featureKey,
      });
      return {
        allowed: false,
        code: 'PLAN_LIMIT_REACHED',
        limit: entitlement.limit,
        currentUsage: current.toString(),
      };
    }
    return {
      allowed: true,
      limit: entitlement.limit,
      currentUsage: current.toString(),
    };
  }

  /** Boolean convenience for non-limit features. */
  async isEnabled(
    organizationId: string,
    featureKey: string,
  ): Promise<boolean> {
    const decision = await this.evaluate(organizationId, featureKey);
    return decision.allowed;
  }

  /**
   * Returns a complete effective feature entitlement map for an organization,
   * merging plan baseline with any active per-merchant overrides.
   */
  async getEffectiveEntitlements(
    organizationId: string,
  ): Promise<EffectiveEntitlementItem[]> {
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: { include: { entitlements: true } },
        entitlementOverrides: true,
      },
    });

    const now = new Date();
    const activeOverrides = new Map<
      string,
      {
        id: string;
        enabled: boolean;
        limit: number | null;
        expiresAt: Date;
        reason: string;
      }
    >();

    if (subscription?.entitlementOverrides) {
      for (const override of subscription.entitlementOverrides) {
        if (override.revokedAt === null && override.expiresAt > now) {
          activeOverrides.set(override.featureKey, override);
        }
      }
    }

    const planEntitlements = new Map<
      string,
      { enabled: boolean; limit: number | null }
    >();
    if (subscription?.plan?.entitlements) {
      for (const ent of subscription.plan.entitlements) {
        planEntitlements.set(ent.featureKey, ent);
      }
    }

    const items: EffectiveEntitlementItem[] = [];
    const processedKeys = new Set<string>();

    for (const def of PLATFORM_FEATURES) {
      processedKeys.add(def.key);
      const override = activeOverrides.get(def.key);
      if (override) {
        items.push({
          featureKey: def.key,
          displayName: def.displayName,
          category: def.category,
          description: def.description,
          enabled: override.enabled,
          limit: override.limit,
          source: 'OVERRIDE',
          overrideId: override.id,
          expiresAt: override.expiresAt.toISOString(),
          reason: override.reason,
        });
        continue;
      }

      const planEnt = planEntitlements.get(def.key);
      if (planEnt) {
        items.push({
          featureKey: def.key,
          displayName: def.displayName,
          category: def.category,
          description: def.description,
          enabled: planEnt.enabled,
          limit: planEnt.limit,
          source: 'PLAN',
        });
        continue;
      }

      // Default when not specified on plan
      items.push({
        featureKey: def.key,
        displayName: def.displayName,
        category: def.category,
        description: def.description,
        enabled: false,
        limit: null,
        source: 'DEFAULT',
      });
    }

    // Process any custom keys that might be in overrides or plan but not canonical
    for (const [key, override] of activeOverrides) {
      if (processedKeys.has(key)) continue;
      items.push({
        featureKey: key,
        displayName: key,
        category: 'SELECTIVE',
        description: 'Custom tenant feature override.',
        enabled: override.enabled,
        limit: override.limit,
        source: 'OVERRIDE',
        overrideId: override.id,
        expiresAt: override.expiresAt.toISOString(),
        reason: override.reason,
      });
      processedKeys.add(key);
    }

    return items;
  }
}
