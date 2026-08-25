import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@app/common';
import type { PlatformPrismaService } from '../platform-prisma.service';

/**
 * Initial SaaS plan catalog — engineering encoding of PO-001/PO-002.
 * Prices are intentionally absent (pilot-dependent); entitlement limits come
 * from the owner decision table in product-owner-decisions-log.md.
 *
 * Idempotent: keyed upserts make re-seeding safe; existing plans are never
 * modified, so operator adjustments survive deploys.
 */
@Injectable()
export class PlatformPlanSeedService {
  private readonly logger = new StructuredLogger(PlatformPlanSeedService.name);

  constructor(private readonly platform: PlatformPrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const catalog: Array<{
      key: string;
      displayName: string;
      amountMinor: number;
      isActive: boolean;
      entitlements: Array<{ featureKey: string; enabled: boolean; limit?: number | null }>;
    }> = [
      {
        key: 'starter',
        displayName: 'Starter',
        amountMinor: 0,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 2 },
          { featureKey: 'products_max', enabled: true, limit: 500 },
          { featureKey: 'warehouses_max', enabled: true, limit: 1 },
          { featureKey: 'basic_reports', enabled: true },
          { featureKey: 'cod', enabled: true },
          { featureKey: 'couriers_basic', enabled: true },
          { featureKey: 'ferio_subdomain', enabled: true },
          { featureKey: 'custom_domain', enabled: false },
          { featureKey: 'advanced_reports', enabled: false },
          { featureKey: 'crm', enabled: false },
          { featureKey: 'campaigns', enabled: false },
        ],
      },
      {
        key: 'business',
        displayName: 'Business',
        amountMinor: 0,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 10 },
          { featureKey: 'products_max', enabled: true, limit: 5000 },
          { featureKey: 'warehouses_max', enabled: true, limit: 3 },
          { featureKey: 'basic_reports', enabled: true },
          { featureKey: 'advanced_reports', enabled: true },
          { featureKey: 'crm', enabled: true },
          { featureKey: 'campaigns', enabled: true },
          { featureKey: 'custom_domain', enabled: true },
          { featureKey: 'cod', enabled: true },
          { featureKey: 'couriers_basic', enabled: true },
          { featureKey: 'ferio_subdomain', enabled: true },
        ],
      },
      {
        key: 'pro',
        displayName: 'Pro',
        amountMinor: 0,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 30 },
          { featureKey: 'products_max', enabled: true, limit: 25000 },
          { featureKey: 'warehouses_max', enabled: true, limit: 10 },
          { featureKey: 'basic_reports', enabled: true },
          { featureKey: 'advanced_reports', enabled: true },
          { featureKey: 'crm', enabled: true },
          { featureKey: 'campaigns', enabled: true },
          { featureKey: 'marketing_advanced', enabled: true },
          { featureKey: 'custom_domain', enabled: true },
          { featureKey: 'priority_support', enabled: true },
          { featureKey: 'cod', enabled: true },
          { featureKey: 'couriers_basic', enabled: true },
          { featureKey: 'ferio_subdomain', enabled: true },
        ],
      },
      // Negotiated per-tenant; seeded inactive until configured with real
      // entitlements by an operator (never guessed in code).
      {
        key: 'enterprise',
        displayName: 'Enterprise',
        amountMinor: 0,
        isActive: false,
        entitlements: [],
      },
      // PO-002: internal Ferio tenants get an explicit INTERNAL-style plan —
      // every feature, no limits, never presented as a paid subscription.
      {
        key: 'internal',
        displayName: 'Ferio Internal',
        amountMinor: 0,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: null },
          { featureKey: 'products_max', enabled: true, limit: null },
          { featureKey: 'warehouses_max', enabled: true, limit: null },
          { featureKey: 'orders_per_month', enabled: true, limit: null },
          { featureKey: 'custom_domain', enabled: true },
          { featureKey: 'advanced_reports', enabled: true },
          { featureKey: 'crm', enabled: true },
          { featureKey: 'campaigns', enabled: true },
          { featureKey: 'basic_reports', enabled: true },
          { featureKey: 'cod', enabled: true },
          { featureKey: 'couriers_basic', enabled: true },
          { featureKey: 'ferio_subdomain', enabled: true },
        ],
      },
    ];

    for (const plan of catalog) {
      const existing = await this.platform.client.plan.findUnique({
        where: { key: plan.key },
      });
      if (existing) continue; // operator-owned after first seed
      await this.platform.client.plan.create({
        data: {
          key: plan.key,
          displayName: plan.displayName,
          billingInterval: 'MONTHLY',
          amountMinor: plan.amountMinor,
          isActive: plan.isActive,
          entitlements: {
            create: plan.entitlements.map((e) => ({
              featureKey: e.featureKey,
              enabled: e.enabled,
              limit: e.limit ?? null,
            })),
          },
        },
      });
    }
    this.logger.log('platform_plan_catalog_seeded', {});
  }
}
