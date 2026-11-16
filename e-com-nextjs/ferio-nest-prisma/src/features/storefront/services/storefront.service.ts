import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, StorefrontSectionType, CollectionType } from '@prisma/client';
import { PrismaService } from '@app/database';
import {
  resolveTenantDatabase,
  TenantDbService,
} from '../../../tenancy/services/tenant-db.service';
import { StorefrontHydrationService } from './storefront-hydration.service';
import {
  CreateCollectionDto,
  PublishStorefrontDto,
  SaveDraftSectionsDto,
  UpdateCollectionDto,
  CollectionQueryDto,
  CollectionRuleDto,
} from '../dto/storefront.dto';
import { CatalogService } from '../../catalog/catalog.service';
import { CollectionRuleCompilerService } from './collection-rule-compiler.service';
import { sanitizeSectionSettings } from '../utils/url-sanitizer.util';
import { StorefrontCacheInvalidationService } from './storefront-cache-invalidation.service';
import type { UserPayload } from '@app/common';

const DEFAULT_HOME_SECTIONS = [
  {
    type: StorefrontSectionType.HERO_SHOWCASE,
    sortOrder: 0,
    enabled: true,
    settings: {
      layout: 'interactive',
      variant: 'interactive',
      title: 'МЕБЕЛЬ И АКСЕССУАРЫ ДЛЯ СОВРЕМЕННОГО ИНТЕРЬЕРА',
      subtitle: 'Воспользуйтесь нашими идеями, чтобы создать интерьер, подходящий вам.',
      ctaText: 'Shop the collection',
      ctaUrl: '/products',
    },
    dataSource: null,
  },
  {
    type: StorefrontSectionType.CATEGORY_GRID,
    sortOrder: 1,
    enabled: true,
    settings: {
      title: 'Shop by category',
      columns: 5,
      showViewAll: true,
      viewAllUrl: '/products',
      hideWhenEmpty: true,
    },
    dataSource: null,
  },
  {
    type: StorefrontSectionType.PRODUCT_GRID,
    sortOrder: 2,
    enabled: true,
    settings: {
      title: 'Featured products',
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllUrl: '/products',
      hideWhenEmpty: true,
    },
    dataSource: { type: 'LATEST_PRODUCTS' },
  },
  {
    type: StorefrontSectionType.PRODUCT_REQUEST_BANNER,
    sortOrder: 3,
    enabled: true,
    settings: {
      title: 'Looking for something specific?',
      hideWhenEmpty: false,
    },
    dataSource: null,
  },
  {
    type: StorefrontSectionType.FEEDBACK_BANNER,
    sortOrder: 4,
    enabled: true,
    settings: {
      title: 'Share your suggestions & wishes',
      hideWhenEmpty: false,
    },
    dataSource: null,
  },
  {
    type: StorefrontSectionType.PRODUCT_GRID,
    sortOrder: 5,
    enabled: true,
    settings: {
      title: 'Exclusive deals',
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllUrl: '/products?sale=true',
      hideWhenEmpty: true,
    },
    dataSource: { type: 'FLASH_SALE' },
  },
  {
    type: StorefrontSectionType.PRODUCT_GRID,
    sortOrder: 6,
    enabled: true,
    settings: {
      title: 'Latest products',
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllUrl: '/products?sort=newest',
      hideWhenEmpty: true,
    },
    dataSource: { type: 'LATEST_PRODUCTS' },
  },
  {
    type: StorefrontSectionType.PRODUCT_GRID,
    sortOrder: 7,
    enabled: true,
    settings: {
      title: 'Best sellers',
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllUrl: '/products',
      hideWhenEmpty: true,
    },
    dataSource: { type: 'BEST_SELLERS' },
  },
  {
    type: StorefrontSectionType.FLASH_SALE,
    sortOrder: 8,
    enabled: true,
    settings: {
      title: 'Flash sale',
      columns: 4,
      productLimit: 4,
      showViewAll: true,
      viewAllUrl: '/products?sale=true',
      hideWhenEmpty: true,
    },
    dataSource: { type: 'FLASH_SALE' },
  },
];

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hydration: StorefrontHydrationService,
    private readonly catalogService: CatalogService,
    private readonly ruleCompiler: CollectionRuleCompilerService,
    private readonly cacheInvalidation: StorefrontCacheInvalidationService,
    @Inject(TenantDbService)
    private readonly tenantDb: TenantDbService | undefined,
  ) {}

  private async db(): Promise<PrismaClient> {
    return resolveTenantDatabase(this.tenantDb, this.prisma, 'storefront-service');
  }

  /**
   * Initializes the default store template for a tenant if not already present.
   */
  async ensureDefaultHomePage(db: PrismaClient): Promise<any> {
    let page = await db.storefrontPage.findUnique({
      where: { slug: 'home' },
      include: {
        publishedVersion: {
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (page && page.publishedVersion) {
      return page;
    }

    // Create page and initial published version
    return db.$transaction(async (tx) => {
      let existingPage = await tx.storefrontPage.findUnique({ where: { slug: 'home' } });
      if (!existingPage) {
        existingPage = await tx.storefrontPage.create({
          data: {
            type: 'HOME',
            slug: 'home',
            title: 'Storefront Homepage',
          },
        });
      }

      // Create Version 1
      const version = await tx.storefrontPageVersion.create({
        data: {
          pageId: existingPage.id,
          versionNumber: 1,
          isPublished: true,
          publishedAt: new Date(),
          changeSummary: 'Default store template initialization',
          sections: {
            create: DEFAULT_HOME_SECTIONS.map((s) => ({
              type: s.type,
              sortOrder: s.sortOrder,
              enabled: s.enabled,
              settings: s.settings,
              dataSource: s.dataSource || undefined,
            })),
          },
        },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      // Update pointer
      return tx.storefrontPage.update({
        where: { id: existingPage.id },
        data: {
          publishedVersionId: version.id,
        },
        include: {
          publishedVersion: {
            include: {
              sections: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Public storefront read: Fetches the active published page with batched hydrated products.
   */
  async getPublishedPage(slug = 'home'): Promise<any> {
    const db = await this.db();
    let page = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        publishedVersion: {
          include: {
            sections: {
              where: { enabled: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!page || !page.publishedVersion) {
      if (slug === 'home') {
        page = await this.ensureDefaultHomePage(db);
      }
    }

    if (!page || !page.publishedVersion) {
      throw new NotFoundException(`Storefront page '${slug}' not found`);
    }

    const sections = page.publishedVersion?.sections || [];
    const hydratedSections = await this.hydration.hydrateSections(db, sections, true);

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      versionNumber: page.publishedVersion?.versionNumber ?? 1,
      publishedAt: page.publishedVersion?.publishedAt,
      sections: hydratedSections,
    };
  }

  /**
   * Admin Studio draft read: Loads the editable draft version for a page.
   */
  async getDraftPage(slug = 'home'): Promise<any> {
    const db = await this.db();
    let page = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        publishedVersion: true,
      },
    });

    if (!page) {
      if (slug === 'home') {
        page = await this.ensureDefaultHomePage(db);
      }
    }

    if (!page) {
      throw new NotFoundException(`Storefront page '${slug}' not found`);
    }

    const latestVersion = page.versions?.[0] || page.publishedVersion;
    const sections = latestVersion?.sections || [];

    // Hydrate preview data for studio preview
    const hydratedSections = await this.hydration.hydrateSections(db, sections, false);

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      publishedVersionId: page.publishedVersionId,
      draftVersionNumber: latestVersion?.versionNumber ?? 1,
      sections: hydratedSections,
    };
  }

  /**
   * Admin Studio save draft: Updates section list, ordering, and settings.
   */
  async saveDraftSections(slug: string, dto: SaveDraftSectionsDto): Promise<any> {
    const db = await this.db();
    let page: any = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        publishedVersion: true,
      },
    });

    if (!page && slug === 'home') {
      page = await this.ensureDefaultHomePage(db);
    }

    if (!page) throw new NotFoundException(`Page '${slug}' not found`);

    let latestVersion = page.versions?.[0] || page.publishedVersion;
    if (!latestVersion) {
      page = await this.ensureDefaultHomePage(db);
      latestVersion = page.publishedVersion;
    }
    if (!latestVersion) throw new BadRequestException('No draft version found');

    // Replace sections in current draft
    await db.$transaction(async (tx) => {
      await tx.storefrontSection.deleteMany({
        where: { versionId: latestVersion.id },
      });

      if (dto.sections.length > 0) {
        await tx.storefrontSection.createMany({
          data: dto.sections.map((s, index) => ({
            versionId: latestVersion.id,
            type: s.type,
            enabled: s.enabled,
            sortOrder: s.sortOrder ?? index,
            settings: sanitizeSectionSettings(s.settings || {}),
            dataSource: s.dataSource || undefined,
          })),
        });
      }
    });

    return this.getDraftPage(slug);
  }

  /**
   * Atomic publish: Freezes current draft into an immutable version snapshot,
   * updates the publishedVersionId pointer, and records an audit log.
   */
  async publishPage(slug: string, dto: PublishStorefrontDto, actor: UserPayload): Promise<any> {
    const db = await this.db();
    let page: any = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { sections: true },
        },
      },
    });

    if (!page && slug === 'home') {
      page = await this.ensureDefaultHomePage(db);
    }

    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    const draft = page.versions?.[0];
    if (!draft) throw new BadRequestException('No draft available to publish');

    const result = await db.$transaction(async (tx) => {
      // 1. Mark current draft as published
      const published = await tx.storefrontPageVersion.update({
        where: { id: draft.id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          publishedById: actor?.userId,
          changeSummary: dto.changeSummary || 'Published updates',
        },
      });

      // 2. Atomically point publishedVersionId to this version
      await tx.storefrontPage.update({
        where: { id: page.id },
        data: {
          publishedVersionId: published.id,
        },
      });

      // 3. Record audit snapshot
      await tx.storefrontPublicationAudit.create({
        data: {
          pageId: page.id,
          versionNumber: published.versionNumber,
          actorId: actor?.userId || 'unknown',
          actorEmail: actor?.email || 'unknown',
          action: 'PUBLISH',
          snapshotJson: {
            sections: draft.sections,
            publishedAt: new Date(),
          },
        },
      });

      // 4. Create the next new DRAFT version clone for subsequent edits
      const nextVersionNumber = published.versionNumber + 1;
      await tx.storefrontPageVersion.create({
        data: {
          pageId: page.id,
          versionNumber: nextVersionNumber,
          isPublished: false,
          changeSummary: 'Working draft',
          sections: {
            create: (draft.sections || []).map((s: any) => ({
              type: s.type,
              enabled: s.enabled,
              sortOrder: s.sortOrder,
              settings: s.settings as any,
              dataSource: s.dataSource as any,
            })),
          },
        },
      });

      return {
        success: true,
        versionNumber: published.versionNumber,
        publishedAt: published.publishedAt,
      };
    });

    // Invalidate edge cache immediately on publish
    await this.cacheInvalidation.invalidatePage(slug);

    return result;
  }

  /**
   * Atomic rollback: Repoints publishedVersionId to a previous version number.
   */
  async rollbackPage(slug: string, versionNumber: number, actor: UserPayload): Promise<any> {
    const db = await this.db();
    const page = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        versions: {
          where: { versionNumber },
          include: { sections: true },
        },
      },
    });

    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    const targetVersion = page.versions[0];
    if (!targetVersion) {
      throw new NotFoundException(`Version ${versionNumber} does not exist`);
    }

    const result = await db.$transaction(async (tx) => {
      // Repoint active pointer
      await tx.storefrontPage.update({
        where: { id: page.id },
        data: {
          publishedVersionId: targetVersion.id,
        },
      });

      // Record rollback in audit
      await tx.storefrontPublicationAudit.create({
        data: {
          pageId: page.id,
          versionNumber: targetVersion.versionNumber,
          actorId: actor?.userId || 'unknown',
          actorEmail: actor?.email || 'unknown',
          action: 'ROLLBACK',
          snapshotJson: {
            restoredVersion: targetVersion.versionNumber,
            restoredAt: new Date(),
          },
        },
      });

      return {
        success: true,
        restoredVersionNumber: targetVersion.versionNumber,
      };
    });

    // Invalidate edge cache immediately on rollback
    await this.cacheInvalidation.invalidatePage(slug);

    return result;
  }

  /**
   * Version history for admin audit & rollback pickers.
   */
  async getPageHistory(slug: string): Promise<any[]> {
    const db = await this.db();
    const page = await db.storefrontPage.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          select: {
            id: true,
            versionNumber: true,
            isPublished: true,
            publishedAt: true,
            changeSummary: true,
            createdAt: true,
          },
        },
      },
    });

    if (!page) throw new NotFoundException(`Page '${slug}' not found`);
    return page.versions;
  }

  // ==========================================================================
  // PRODUCT COLLECTIONS MANAGEMENT
  // ==========================================================================

  async getCollections(query: CollectionQueryDto): Promise<any> {
    const db = await this.db();
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.productCollection.findMany({
        where,
        include: {
          _count: { select: { items: true, rules: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.productCollection.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCollectionById(id: string): Promise<any> {
    const db = await this.db();
    const collection = await db.productCollection.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                media: { take: 1, select: { url: true } },
              },
            },
          },
        },
        rules: true,
      },
    });

    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  async getCollectionBySlug(slug: string): Promise<any> {
    const db = await this.db();
    const collection = await db.productCollection.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isActive: true,
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              include: {
                category: true,
                brandRel: true,
                media: { orderBy: { sortOrder: 'asc' } },
                variants: {
                  where: { isActive: true },
                  include: { inventory: { include: { warehouse: true } } },
                },
              },
            },
          },
        },
        rules: true,
      },
    });

    if (!collection) throw new NotFoundException(`Collection '${slug}' not found`);

    let products: any[] = [];
    if (collection.type === 'MANUAL') {
      products = collection.items
        .filter((item) => item.product?.status === 'ACTIVE')
        .map((item) => this.catalogService.serializeProduct(item.product as any, true));
    } else {
      const whereClause = this.ruleCompiler.compile(
        collection.rules as CollectionRuleDto[],
        (collection.matchMode as 'ALL' | 'ANY') || 'ALL',
      );
      const dbProducts = await db.product.findMany({
        where: whereClause,
        include: {
          category: true,
          brandRel: true,
          media: { orderBy: { sortOrder: 'asc' } },
          variants: {
            where: { isActive: true },
            include: { inventory: { include: { warehouse: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      products = dbProducts.map((p) => this.catalogService.serializeProduct(p as any, true));
    }

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      bannerImageUrl: collection.bannerImageUrl,
      type: collection.type,
      seoTitle: collection.seoTitle,
      seoDescription: collection.seoDescription,
      totalCount: products.length,
      products,
    };
  }

  async createCollection(dto: CreateCollectionDto): Promise<any> {
    const db = await this.db();
    const slug = dto.slug?.trim() || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await db.productCollection.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Collection with slug '${slug}' already exists`);
    }

    return db.$transaction(async (tx) => {
      const collection = await tx.productCollection.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          bannerImageUrl: dto.bannerImageUrl,
          type: dto.type || CollectionType.MANUAL,
          matchMode: dto.matchMode || 'ALL',
        },
      });

      if (dto.type === CollectionType.AUTOMATIC && dto.rules?.length) {
        await tx.productCollectionRule.createMany({
          data: dto.rules.map((r) => ({
            collectionId: collection.id,
            field: r.field,
            operator: r.operator,
            value: r.value,
          })),
        });
      } else if (dto.productIds?.length) {
        await tx.productCollectionItem.createMany({
          data: dto.productIds.map((productId, index) => ({
            collectionId: collection.id,
            productId,
            sortOrder: index,
          })),
        });
      }

      return collection;
    });
  }

  async updateCollection(id: string, dto: UpdateCollectionDto): Promise<any> {
    const db = await this.db();
    const existing = await db.productCollection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Collection not found');

    return db.$transaction(async (tx) => {
      await tx.productCollection.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          bannerImageUrl: dto.bannerImageUrl,
          isActive: dto.isActive,
          matchMode: dto.matchMode,
        },
      });

      if (dto.rules !== undefined) {
        await tx.productCollectionRule.deleteMany({ where: { collectionId: id } });
        if (dto.rules.length > 0) {
          await tx.productCollectionRule.createMany({
            data: dto.rules.map((r) => ({
              collectionId: id,
              field: r.field,
              operator: r.operator,
              value: r.value,
            })),
          });
        }
      }

      if (dto.productIds !== undefined) {
        await tx.productCollectionItem.deleteMany({ where: { collectionId: id } });
        if (dto.productIds.length > 0) {
          await tx.productCollectionItem.createMany({
            data: dto.productIds.map((productId, index) => ({
              collectionId: id,
              productId,
              sortOrder: index,
            })),
          });
        }
      }

      return this.getCollectionById(id);
    });
  }

  async deleteCollection(id: string): Promise<{ success: boolean }> {
    const db = await this.db();
    await db.productCollection.delete({ where: { id } });
    return { success: true };
  }
}
