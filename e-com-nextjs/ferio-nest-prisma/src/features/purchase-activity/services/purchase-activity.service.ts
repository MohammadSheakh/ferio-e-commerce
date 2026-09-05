import {
  Injectable,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { PurchaseActivityQueryDto } from '../purchase-activity.dto';
import { maskPurchaseCustomerName } from '../utils/purchase-activity.util';

@Injectable()
export class PurchaseActivityService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7/MT-8: tenant client inside resolved storefront/admin requests;
   * explicit legacy fallback otherwise. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }
  async getPublic(query: PurchaseActivityQueryDto) {
    const settings = await this.getSettings();
    const enabled =
      query.surface === 'toast'
        ? settings.purchaseActivityEnabled
        : settings.purchaseHistoryEnabled;
    if (!enabled) return this.response([], 0, query, settings);
    return this.list(query, settings);
  }

  async getAdmin(query: PurchaseActivityQueryDto) {
    return this.list(query, await this.getSettings());
  }

  private async list(
    query: PurchaseActivityQueryDto,
    settings: Awaited<ReturnType<PurchaseActivityService['getSettings']>>,
  ) {
    const db = await this.db();
    const cutoff = new Date(
      Date.now() - settings.purchaseActivityMaxAgeDays * 86_400_000,
    );
    const visibleItemWhere: Prisma.OrderItemWhereInput = settings
      .purchaseActivityExcludedProductIds.length
      ? {
          productIdSnapshot: {
            notIn: settings.purchaseActivityExcludedProductIds,
          },
        }
      : {};
    const where: Prisma.OrderWhereInput = {
      purchaseActivityConsent: true,
      status: { in: ['DELIVERED', 'COMPLETED'] },
      createdAt: { gte: cutoff },
      items: { some: visibleItemWhere },
    };
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          address: {
            select: {
              recipientName: true,
              district: true,
              area: true,
            },
          },
          items: {
            where: visibleItemWhere,
            orderBy: { createdAt: 'asc' },
            select: {
              productIdSnapshot: true,
              productName: true,
              variantName: true,
              imageUrl: true,
              quantity: true,
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);
    return this.response(
      orders.map((order) => {
        const primaryItem = order.items[0];
        const totalItemCount = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        return {
          id: order.id,
          productId: primaryItem.productIdSnapshot,
          productName: primaryItem.productName,
          variantName: primaryItem.variantName,
          imageUrl: primaryItem.imageUrl,
          additionalItemCount: Math.max(0, totalItemCount - 1),
          customerName: maskPurchaseCustomerName(
            order.address?.recipientName ?? '',
          ),
          location: settings.purchaseActivityShowArea
            ? order.address?.area ?? null
            : settings.purchaseActivityShowDistrict
              ? order.address?.district ?? null
              : null,
          purchasedAt: order.createdAt,
          verifiedPurchase: true as const,
        };
      }),
      total,
      query,
      settings,
    );
  }

  private response(
    items: unknown[],
    total: number,
    query: PurchaseActivityQueryDto,
    settings: Awaited<ReturnType<PurchaseActivityService['getSettings']>>,
  ) {
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      settings: {
        activityEnabled: settings.purchaseActivityEnabled,
        historyEnabled: settings.purchaseHistoryEnabled,
        displayDurationMs: settings.purchaseActivityDurationMs,
        intervalSeconds: settings.purchaseActivityIntervalSeconds,
      },
    };
  }

  private async getSettings() {
    const db = await this.db();
    return db.commerceSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', storeName: 'Ferio' },
    });
  }
}
