import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, StorefrontAnalyticsEventType } from '@prisma/client';
import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { toTenantJsonInput } from '../../core/database/json-input.util';
import { CreateStorefrontAnalyticsEventDto } from './storefront-analytics.dto';
import { CommerceSettingsService } from '../settings/services/commerce-settings.service';
import {
  sanitizeAnalyticsPath,
  sanitizeFilters,
  sanitizeSearchTerm,
} from './utils/storefront-analytics.util';

interface DailyOrderAggregate {
  date: string;
  orders: number | bigint;
  revenue: number | bigint;
}

function databaseNumber(value: number | bigint): number {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)) {
    throw new Error('ANALYTICS_AGGREGATE_OUT_OF_RANGE');
  }
  return normalized;
}

@Injectable()
export class StorefrontAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: CommerceSettingsService,

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
  async create(dto: CreateStorefrontAnalyticsEventDto) {
    const db = await this.db();
    if (!(await this.settings.get()).storefrontAnalyticsEnabled) {
      return { accepted: false, duplicate: false, disabled: true };
    }
    const searchTerm = sanitizeSearchTerm(dto.searchTerm);
    const filters = sanitizeFilters(dto.filters);
    await this.validateEvent(dto, searchTerm, filters);

    try {
      await db.storefrontAnalyticsEvent.create({
        data: {
          eventId: dto.eventId,
          type: dto.type,
          eventVersion: 2,
          source: 'CUSTOMER_WEB',
          visitorHash: this.hashVisitor(dto.anonymousId),
          productId: dto.productId,
          variantId: dto.variantId,
          searchTerm,
          searchResultCount: dto.searchResultCount,
          filters: toTenantJsonInput(filters),
          quantity: dto.quantity,
          path: sanitizeAnalyticsPath(dto.path),
        },
      });
      return { accepted: true, duplicate: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { accepted: true, duplicate: true };
      }
      throw error;
    }
  }

  private async validateEvent(
    dto: CreateStorefrontAnalyticsEventDto,
    searchTerm?: string,
    filters?: Record<string, boolean | number | string>,
  ) {
    const db = await this.db();
    if (dto.type === StorefrontAnalyticsEventType.SEARCH && !searchTerm) {
      throw new BadRequestException('A search event requires a search term.');
    }
    if (
      dto.type !== StorefrontAnalyticsEventType.SEARCH &&
      dto.searchResultCount !== undefined
    ) {
      throw new BadRequestException(
        'A search result count is valid only for search events.',
      );
    }
    if (dto.type === StorefrontAnalyticsEventType.FILTER && !filters) {
      throw new BadRequestException(
        'A filter event requires supported filters.',
      );
    }
    if (dto.type === StorefrontAnalyticsEventType.PRODUCT_VIEW) {
      if (!dto.productId) {
        throw new BadRequestException('A product view requires a product.');
      }
      const product = await db.product.findFirst({
        where: { id: dto.productId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!product) throw new BadRequestException('Product is unavailable.');
    }
    if (dto.type === StorefrontAnalyticsEventType.ADD_TO_CART) {
      if (!dto.productId || !dto.variantId || !dto.quantity) {
        throw new BadRequestException(
          'An add-to-cart event requires product, variant, and quantity.',
        );
      }
      const variant = await db.productVariant.findFirst({
        where: {
          id: dto.variantId,
          productId: dto.productId,
          isActive: true,
          product: { status: 'ACTIVE' },
        },
        select: { id: true },
      });
      if (!variant) throw new BadRequestException('Variant is unavailable.');
    }
  }

  async getTopSearches(days = 30, limit = 20) {
    const db = await this.db();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const searches = await db.storefrontAnalyticsEvent.groupBy({
      by: ['searchTerm'],
      where: {
        type: StorefrontAnalyticsEventType.SEARCH,
        searchTerm: { not: null },
        createdAt: { gte: startDate },
      },
      _count: { searchTerm: true },
      orderBy: { _count: { searchTerm: 'desc' } },
      take: limit,
    });

    return searches.map((s) => ({
      query: s.searchTerm ?? '',
      count: s._count.searchTerm,
    }));
  }

  async getZeroResultSearches(days = 30, limit = 20) {
    const db = await this.db();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const zeroSearches = await db.storefrontAnalyticsEvent.groupBy({
      by: ['searchTerm'],
      where: {
        type: StorefrontAnalyticsEventType.SEARCH,
        searchTerm: { not: null },
        createdAt: { gte: startDate },
        searchResultCount: 0,
      },
      _count: { searchTerm: true },
      orderBy: { _count: { searchTerm: 'desc' } },
      take: limit,
    });

    return zeroSearches.map((s) => ({
      query: s.searchTerm ?? '',
      count: s._count.searchTerm,
      isZeroResult: true,
    }));
  }

  async getViewedButNotPurchased(days = 30, limit = 20) {
    const db = await this.db();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const views = await db.storefrontAnalyticsEvent.groupBy({
      by: ['productId'],
      where: {
        type: StorefrontAnalyticsEventType.PRODUCT_VIEW,
        productId: { not: null },
        createdAt: { gte: startDate },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 50,
    });

    const productIds = views
      .map((v) => v.productId)
      .filter((id): id is string => Boolean(id));

    if (productIds.length === 0) return [];

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        variants: {
          select: { price: true },
          take: 1,
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const purchases = await db.orderItem.groupBy({
      by: ['productIdSnapshot'],
      where: {
        productIdSnapshot: { in: productIds },
        order: { createdAt: { gte: startDate } },
      },
      _count: { productIdSnapshot: true },
    });

    const purchaseMap = new Map(
      purchases.map((p) => [
        p.productIdSnapshot,
        p._count?.productIdSnapshot ?? 0,
      ]),
    );

    return views
      .map((v) => {
        const product = productMap.get(v.productId!);
        const viewCount = v._count.productId;
        const purchaseCount = purchaseMap.get(v.productId!) ?? 0;
        const conversionRate =
          viewCount > 0
            ? ((purchaseCount / viewCount) * 100).toFixed(1) + '%'
            : '0%';
        const price = product?.variants?.[0]?.price ?? 0;
        return {
          productId: v.productId,
          productName: product?.name ?? 'Unknown Product',
          slug: product?.slug ?? '',
          price,
          views: viewCount,
          purchases: purchaseCount,
          conversionRate,
        };
      })
      .filter((item) => item.productName !== 'Unknown Product')
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  async getAnalyticsOverview(days = 30) {
    const db = await this.db();
    const boundedDays = Number.isInteger(days)
      ? Math.max(1, Math.min(365, days))
      : 30;
    const now = new Date();
    const startDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        (boundedDays - 1) * 86_400_000,
    );

    const eventCounts = await db.storefrontAnalyticsEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: startDate } },
      _count: { type: true },
    });

    const countMap = new Map(eventCounts.map((e) => [e.type, e._count.type]));
    const productViews =
      countMap.get(StorefrontAnalyticsEventType.PRODUCT_VIEW) ?? 0;
    const searchCount = countMap.get(StorefrontAnalyticsEventType.SEARCH) ?? 0;
    const addToCartCount =
      countMap.get(StorefrontAnalyticsEventType.ADD_TO_CART) ?? 0;
    const checkoutBeginCount =
      countMap.get(StorefrontAnalyticsEventType.CHECKOUT_BEGIN) ?? 0;

    // Return at most one row per requested day. Pulling every order into Node
    // made dashboard memory and network cost proportional to order history.
    const orderTrend = await db.$queryRaw<DailyOrderAggregate[]>(Prisma.sql`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD') AS "date",
        COUNT(*)::bigint AS "orders",
        COALESCE(SUM("total"), 0)::bigint AS "revenue"
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND "status" <> 'CANCELLED'
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY "date" ASC
    `);

    const dailyMap = new Map<
      string,
      { date: string; revenue: number; orders: number }
    >();
    for (let i = boundedDays - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
          i * 86_400_000,
      );
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
    }

    for (const row of orderTrend) {
      const existing = dailyMap.get(row.date);
      if (existing) {
        existing.revenue = databaseNumber(row.revenue);
        existing.orders = databaseNumber(row.orders);
      }
    }

    const dailyTrend = Array.from(dailyMap.values());
    const totalRevenue = dailyTrend.reduce((sum, row) => sum + row.revenue, 0);
    const totalOrders = dailyTrend.reduce((sum, row) => sum + row.orders, 0);
    const topSearches = await this.getTopSearches(boundedDays, 10);
    const zeroResultSearches = await this.getZeroResultSearches(
      boundedDays,
      10,
    );
    const viewedButNotPurchased = await this.getViewedButNotPurchased(
      boundedDays,
      10,
    );

    return {
      summary: {
        totalRevenue,
        totalOrders,
        productViews,
        searchCount,
        addToCartCount,
      },
      dailyTrend,
      topSearches,
      zeroResultSearches,
      viewedButNotPurchased,
      funnel: {
        productViews,
        addToCart: addToCartCount,
        checkoutBegin: checkoutBeginCount,
        purchased: totalOrders,
      },
    };
  }

  private hashVisitor(anonymousId: string) {
    const secret =
      this.config.get<string>('ANALYTICS_HASH_SECRET') ??
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return createHmac('sha256', secret).update(anonymousId).digest('hex');
  }
}
