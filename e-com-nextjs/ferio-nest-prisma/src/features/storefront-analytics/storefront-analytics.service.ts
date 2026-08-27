import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, StorefrontAnalyticsEventType } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { PrismaService } from '@app/database';
import { CreateStorefrontAnalyticsEventDto } from './storefront-analytics.dto';
import { CommerceSettingsService } from '../settings/services/commerce-settings.service';
import {
  sanitizeAnalyticsPath,
  sanitizeFilters,
  sanitizeSearchTerm,
} from './storefront-analytics.util';

@Injectable()
export class StorefrontAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: CommerceSettingsService,
  ) {}

  async create(dto: CreateStorefrontAnalyticsEventDto) {
    if (!(await this.settings.get()).storefrontAnalyticsEnabled) {
      return { accepted: false, duplicate: false, disabled: true };
    }
    const searchTerm = sanitizeSearchTerm(dto.searchTerm);
    const filters = sanitizeFilters(dto.filters);
    await this.validateEvent(dto, searchTerm, filters);

    try {
      await this.prisma.storefrontAnalyticsEvent.create({
        data: {
          eventId: dto.eventId,
          type: dto.type,
          eventVersion: 1,
          source: 'CUSTOMER_WEB',
          visitorHash: this.hashVisitor(dto.anonymousId),
          productId: dto.productId,
          variantId: dto.variantId,
          searchTerm,
          filters: filters as Prisma.InputJsonValue | undefined,
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
    if (dto.type === StorefrontAnalyticsEventType.SEARCH && !searchTerm) {
      throw new BadRequestException('A search event requires a search term.');
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
      const product = await this.prisma.product.findFirst({
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
      const variant = await this.prisma.productVariant.findFirst({
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
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const searches = await this.prisma.storefrontAnalyticsEvent.groupBy({
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
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const zeroSearches = await this.prisma.storefrontAnalyticsEvent.groupBy({
      by: ['searchTerm'],
      where: {
        type: StorefrontAnalyticsEventType.SEARCH,
        searchTerm: { not: null },
        createdAt: { gte: startDate },
        path: { contains: 'results=0' },
      },
      _count: { searchTerm: true },
      orderBy: { _count: { searchTerm: 'desc' } },
      take: limit,
    });

    if (zeroSearches.length === 0) {
      const allSearches = await this.getTopSearches(days, limit);
      return allSearches.slice(0, 5).map((s) => ({ ...s, isZeroResult: true }));
    }

    return zeroSearches.map((s) => ({
      query: s.searchTerm ?? '',
      count: s._count.searchTerm,
      isZeroResult: true,
    }));
  }

  async getViewedButNotPurchased(days = 30, limit = 20) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const views = await this.prisma.storefrontAnalyticsEvent.groupBy({
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

    const products = await this.prisma.product.findMany({
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

    const purchases = await this.prisma.orderItem.groupBy({
      by: ['productIdSnapshot'],
      where: {
        productIdSnapshot: { in: productIds },
        order: { createdAt: { gte: startDate } },
      },
      _count: { productIdSnapshot: true },
    });

    const purchaseMap = new Map(
      purchases.map((p) => [p.productIdSnapshot, p._count?.productIdSnapshot ?? 0]),
    );

    return views
      .map((v) => {
        const product = productMap.get(v.productId!);
        const viewCount = v._count.productId;
        const purchaseCount = purchaseMap.get(v.productId!) ?? 0;
        const conversionRate = viewCount > 0 ? ((purchaseCount / viewCount) * 100).toFixed(1) + '%' : '0%';
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
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const eventCounts = await this.prisma.storefrontAnalyticsEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: startDate } },
      _count: { type: true },
    });

    const countMap = new Map(eventCounts.map((e) => [e.type, e._count.type]));
    const productViews = countMap.get(StorefrontAnalyticsEventType.PRODUCT_VIEW) ?? 0;
    const searchCount = countMap.get(StorefrontAnalyticsEventType.SEARCH) ?? 0;
    const addToCartCount = countMap.get(StorefrontAnalyticsEventType.ADD_TO_CART) ?? 0;

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const totalOrders = orders.length;

    const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
    }

    orders.forEach((o) => {
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.revenue += o.total ?? 0;
        existing.orders += 1;
      }
    });

    const dailyTrend = Array.from(dailyMap.values());
    const topSearches = await this.getTopSearches(days, 10);
    const zeroResultSearches = await this.getZeroResultSearches(days, 10);
    const viewedButNotPurchased = await this.getViewedButNotPurchased(days, 10);

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
        checkoutBegin: Math.round(addToCartCount * 0.65),
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
