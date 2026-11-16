import { Injectable } from '@nestjs/common';
import { PrismaClient, StorefrontSectionType } from '@prisma/client';
import { CatalogService } from '../../catalog/catalog.service';
import { CollectionRuleCompilerService } from './collection-rule-compiler.service';
import { CollectionRuleDto } from '../dto/storefront.dto';

const productInclude = {
  category: true,
  brandRel: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  youtubeReviews: {
    orderBy: [{ isFeatured: 'desc' as const }, { createdAt: 'desc' as const }],
  },
  features: { orderBy: { sortOrder: 'asc' as const } },
  specifications: { orderBy: { sortOrder: 'asc' as const } },
  variants: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      inventory: {
        include: { warehouse: true },
      },
    },
  },
};

@Injectable()
export class StorefrontHydrationService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly ruleCompiler: CollectionRuleCompilerService,
  ) {}

  /**
   * Hydrates all enabled sections in a single batched pass (Zero N+1 queries).
   */
  async hydrateSections(
    db: PrismaClient,
    sections: any[],
    isPublic: boolean = true,
  ): Promise<any[]> {
    if (!sections || sections.length === 0) return [];

    const enabledSections = sections.filter((s) => s.enabled);
    if (enabledSections.length === 0) return [];

    // Collect data requirements across sections
    const needsCategories = enabledSections.some(
      (s) => s.type === StorefrontSectionType.CATEGORY_GRID,
    );

    const collectionIdsToFetch = new Set<string>();
    let needsLatestProducts = false;
    let needsBestSellers = false;
    let needsFlashSales = false;

    for (const section of enabledSections) {
      const ds = (section.dataSource as Record<string, any>) || {};
      const type = section.type;

      if (ds.type === 'COLLECTION' && ds.collectionId) {
        collectionIdsToFetch.add(ds.collectionId);
      } else if (ds.type === 'LATEST_PRODUCTS' || type === StorefrontSectionType.PRODUCT_GRID && !ds.type) {
        needsLatestProducts = true;
      } else if (ds.type === 'BEST_SELLERS') {
        needsBestSellers = true;
      } else if (ds.type === 'FLASH_SALE' || type === StorefrontSectionType.FLASH_SALE) {
        needsFlashSales = true;
      }
    }

    // Execute batch queries in parallel
    const [
      categories,
      collectionsMap,
      latestProducts,
      bestSellerProducts,
      flashSaleProducts,
    ] = await Promise.all([
      needsCategories
        ? db.category.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            take: 20,
          })
        : Promise.resolve([]),

      this.fetchCollectionsBatch(db, Array.from(collectionIdsToFetch)),

      needsLatestProducts
        ? this.fetchLatestProducts(db, 16)
        : Promise.resolve([]),

      needsBestSellers
        ? this.fetchBestSellers(db, 16)
        : Promise.resolve([]),

      needsFlashSales
        ? this.fetchFlashSaleProducts(db, 16)
        : Promise.resolve([]),
    ]);

    // Hydrate each section
    return enabledSections.map((section) => {
      const settings = (section.settings as Record<string, any>) || {};
      const ds = (section.dataSource as Record<string, any>) || {};
      const limit = settings.productLimit || 8;

      let data: Record<string, any> = {};

      switch (section.type) {
        case StorefrontSectionType.CATEGORY_GRID:
          data = {
            categories: categories.slice(0, settings.columns ? settings.columns * 2 : 10),
          };
          break;

        case StorefrontSectionType.PRODUCT_GRID:
        case StorefrontSectionType.PRODUCT_CAROUSEL: {
          let items: any[] = [];
          if (ds.type === 'COLLECTION' && ds.collectionId) {
            items = collectionsMap.get(ds.collectionId) || [];
          } else if (ds.type === 'BEST_SELLERS') {
            items = bestSellerProducts;
          } else if (ds.type === 'FLASH_SALE') {
            items = flashSaleProducts;
          } else {
            items = latestProducts;
          }
          data = { items: items.slice(0, limit) };
          break;
        }

        case StorefrontSectionType.FLASH_SALE:
          data = {
            items: (flashSaleProducts.length > 0 ? flashSaleProducts : latestProducts).slice(0, limit),
          };
          break;

        default:
          data = {};
          break;
      }

      return {
        ...section,
        data,
      };
    });
  }

  private async fetchCollectionsBatch(
    db: PrismaClient,
    collectionIds: string[],
  ): Promise<Map<string, any[]>> {
    const map = new Map<string, any[]>();
    if (collectionIds.length === 0) return map;

    const collections = await db.productCollection.findMany({
      where: { id: { in: collectionIds }, isActive: true },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          take: 36,
          include: {
            product: {
              include: productInclude,
            },
          },
        },
        rules: true,
      },
    });

    for (const col of collections) {
      if (col.type === 'MANUAL') {
        const serialized = col.items
          .filter((item) => item.product.status === 'ACTIVE')
          .map((item) => this.catalogService.serializeProduct(item.product as any, true));
        map.set(col.id, serialized);
      } else {
        // Automatic rule-based collection
        const whereClause = this.ruleCompiler.compile(
          col.rules as CollectionRuleDto[],
          (col.matchMode as 'ALL' | 'ANY') || 'ALL',
        );
        const products = await db.product.findMany({
          where: whereClause,
          include: productInclude,
          orderBy: { createdAt: 'desc' },
          take: 36,
        });
        map.set(
          col.id,
          products.map((p) => this.catalogService.serializeProduct(p as any, true)),
        );
      }
    }

    return map;
  }

  private async fetchLatestProducts(db: PrismaClient, take: number): Promise<any[]> {
    const products = await db.product.findMany({
      where: { status: 'ACTIVE' },
      include: productInclude,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take,
    });
    return products.map((p) => this.catalogService.serializeProduct(p as any, true));
  }

  private async fetchBestSellers(db: PrismaClient, take: number): Promise<any[]> {
    // If order items exist, aggregate top selling product IDs, otherwise fall back to featured/active
    try {
      const topSales = await db.orderItem.groupBy({
        by: ['productIdSnapshot'],
        where: {
          order: {
            status: { in: ['DELIVERED', 'COMPLETED', 'CONFIRMED'] },
          },
        },
        _sum: { quantity: true },
        orderBy: {
          _sum: { quantity: 'desc' },
        },
        take,
      });

      const topProductIds = topSales.map((s) => s.productIdSnapshot).filter(Boolean);
      if (topProductIds.length > 0) {
        const products = await db.product.findMany({
          where: { id: { in: topProductIds }, status: 'ACTIVE' },
          include: productInclude,
        });
        // Retain sales order
        const lookup = new Map(products.map((p) => [p.id, p]));
        const sorted = topProductIds
          .map((id) => lookup.get(id))
          .filter((p): p is (typeof products)[number] => p !== undefined)
          .map((p) => this.catalogService.serializeProduct(p as any, true));
        return sorted;
      }
    } catch {
      // Fallback
    }

    return this.fetchLatestProducts(db, take);
  }

  private async fetchFlashSaleProducts(db: PrismaClient, take: number): Promise<any[]> {
    const products = await db.product.findMany({
      where: {
        status: 'ACTIVE',
        variants: {
          some: {
            compareAtPrice: { gt: 0 },
            isActive: true,
          },
        },
      },
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
    return products.map((p) => this.catalogService.serializeProduct(p as any, true));
  }
}
