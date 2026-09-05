import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';

/**
 * Initial SaaS plan catalog — engineering encoding of PO-001/PO-002.
 * Prices and limits follow the owner decision in
 * _doc/multi-tenant/project-owners-decision/tenant-subscription-plans.md.
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
      entitlements: Array<{
        featureKey: string;
        enabled: boolean;
        limit?: number | null;
      }>;
    }> = [
      {
        key: 'starter',
        displayName: 'Starter',
        amountMinor: 99000,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 2 },
          { featureKey: 'products_max', enabled: true, limit: 250 },
          { featureKey: 'orders_per_month', enabled: true, limit: 300 },
          { featureKey: 'warehouses_max', enabled: true, limit: 1 },
          { featureKey: 'storage_gb', enabled: true, limit: 2 },
          { featureKey: 'storefront', enabled: true },
          { featureKey: 'mobile_customer', enabled: true },
          { featureKey: 'inventory', enabled: true },
          { featureKey: 'online_payments', enabled: true },
          { featureKey: 'returns_rto', enabled: true },
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
        amountMinor: 249000,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 5 },
          { featureKey: 'products_max', enabled: true, limit: 2000 },
          { featureKey: 'orders_per_month', enabled: true, limit: 2000 },
          { featureKey: 'warehouses_max', enabled: true, limit: 1 },
          { featureKey: 'storage_gb', enabled: true, limit: 10 },
          { featureKey: 'storefront', enabled: true },
          { featureKey: 'mobile_customer', enabled: true },
          { featureKey: 'inventory', enabled: true },
          { featureKey: 'online_payments', enabled: true },
          { featureKey: 'returns_rto', enabled: true },
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
        amountMinor: 499000,
        isActive: true,
        entitlements: [
          { featureKey: 'staff_seats', enabled: true, limit: 15 },
          { featureKey: 'products_max', enabled: true, limit: 10000 },
          { featureKey: 'orders_per_month', enabled: true, limit: 10000 },
          { featureKey: 'warehouses_max', enabled: true, limit: 3 },
          { featureKey: 'storage_gb', enabled: true, limit: 30 },
          { featureKey: 'storefront', enabled: true },
          { featureKey: 'mobile_customer', enabled: true },
          { featureKey: 'inventory', enabled: true },
          { featureKey: 'online_payments', enabled: true },
          { featureKey: 'returns_rto', enabled: true },
          { featureKey: 'basic_reports', enabled: true },
          { featureKey: 'advanced_reports', enabled: true },
          { featureKey: 'crm', enabled: true },
          { featureKey: 'campaigns', enabled: true },
          { featureKey: 'marketing_advanced', enabled: true },
          { featureKey: 'custom_domain', enabled: true },
          { featureKey: 'priority_support', enabled: true },
          { featureKey: 'rider_management', enabled: true },
          { featureKey: 'live_rider_tracking', enabled: true },
          { featureKey: 'api_webhooks', enabled: true },
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
