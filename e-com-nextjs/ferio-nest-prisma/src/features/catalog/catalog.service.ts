import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import type { PrismaClient } from '@prisma/client';
import { Optional } from '@nestjs/common';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { UserPayload } from '@app/common';
import { AuditService } from '../audit/audit.service';
import {
  AdjustInventoryDto,
  AdminProductQueryDto,
  BrandQueryDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateProductDto,
  InventoryQueryDto,
  ProductQueryDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/catalog.dto';

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
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7 storefront reads: inside a tenant-resolved request this returns the
   * resolved tenant database client; outside one (legacy deployments, admin
   * plane during migration) it falls back to the legacy single-tenant DB.
   * The fallback is EXPLICIT here — TenantDbService.tryGet() never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private resolveSlug(name: string, providedSlug?: string): string {
    const slug = providedSlug ?? this.slugify(name);
    if (!slug) {
      throw new BadRequestException(
        'A Latin-character URL slug is required for this name',
      );
    }
    return slug;
  }

  private ensureValidPrice(price: number, compareAtPrice?: number): void {
    if (compareAtPrice !== undefined && compareAtPrice <= price) {
      throw new BadRequestException(
        'Compare-at price must be greater than the selling price',
      );
    }
  }

  private ensureConditionDetails(
    condition: 'NEW' | 'SECOND_HAND',
    conditionGrade?: 'LIKE_NEW' | 'GOOD' | 'FAIR' | null,
    conditionNote?: string | null,
  ): void {
    if (condition === 'SECOND_HAND' && !conditionGrade) {
      throw new BadRequestException(
        'Second-hand products require a condition grade',
      );
    }
    if (condition === 'SECOND_HAND' && (conditionNote?.trim().length ?? 0) < 10) {
      throw new BadRequestException(
        'Second-hand products require a condition disclosure of at least 10 characters',
      );
    }
  }

  private inventoryMovementType(
    reason: AdjustInventoryDto['adjustmentReason'],
  ) {
    return {
      STOCK_COUNT_CORRECTION: 'CORRECTION',
      PURCHASE_RECEIPT: 'RECEIVE',
      CUSTOMER_RETURN: 'RETURN',
      DAMAGE_WRITE_OFF: 'DAMAGE',
      OTHER: 'MANUAL_ADJUSTMENT',
    }[reason] as
      | 'CORRECTION'
      | 'RECEIVE'
      | 'RETURN'
      | 'DAMAGE'
      | 'MANUAL_ADJUSTMENT';
  }

  private validateInventoryAdjustment(dto: AdjustInventoryDto): Date | null {
    if (
      ['PURCHASE_RECEIPT', 'CUSTOMER_RETURN'].includes(dto.adjustmentReason) &&
      dto.quantityDelta < 0
    ) {
      throw new BadRequestException(
        'Receipts and customer returns must increase stock',
      );
    }
    if (
      dto.adjustmentReason === 'DAMAGE_WRITE_OFF' &&
      dto.quantityDelta > 0
    ) {
      throw new BadRequestException('Damage write-offs must reduce stock');
    }
    if (
      ['PURCHASE_RECEIPT', 'CUSTOMER_RETURN'].includes(dto.adjustmentReason) &&
      !dto.referenceId?.trim()
    ) {
      throw new BadRequestException(
        'A source reference is required for receipts and customer returns',
      );
    }
    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : null;
    if (effectiveAt && effectiveAt.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException('Effective time cannot be in the future');
    }
    return effectiveAt;
  }

  private handlePrismaConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Slug or SKU already exists');
    }
    throw error;
  }

  private extractYoutubeVideoId(url: string) {
    try {
      const parsed = new URL(url);
      if (
        ![
          'youtube.com',
          'www.youtube.com',
          'm.youtube.com',
          'youtu.be',
        ].includes(parsed.hostname)
      ) {
        throw new BadRequestException('Only YouTube links are accepted');
      }
      const id =
        parsed.hostname === 'youtu.be'
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get('v') ??
            parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
      if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
        throw new BadRequestException('Valid YouTube video link required');
      }
      return id;
    } catch {
      throw new BadRequestException('Invalid YouTube URL provided');
    }
  }

  private serializeProduct(product: ProductRecord, publicOnly = false) {
    const sourceVariants = publicOnly
      ? product.variants.filter((variant) => variant.isActive)
      : product.variants;
    const variants = sourceVariants.map((variant) => {
      const inventory = variant.inventory.map((stock) => ({
        warehouseId: stock.warehouseId,
        warehouseCode: stock.warehouse.code,
        warehouseName: stock.warehouse.name,
        onHand: stock.onHand,
        reserved: stock.reserved,
        damaged: stock.damaged,
        incoming: stock.incoming,
        available: Math.max(0, stock.onHand - stock.reserved - stock.damaged),
        lowStockThreshold: stock.lowStockThreshold,
      }));
      const availableStock = inventory.reduce(
        (total, stock) => total + stock.available,
        0,
      );

      return {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        attributes: variant.attributes,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        isActive: variant.isActive,
        sortOrder: variant.sortOrder,
        weightGrams: variant.weightGrams,
        availableStock,
        ...(publicOnly ? {} : { inventory }),
      };
    });
    const defaultVariant =
      variants.find((variant) => variant.isActive) ?? variants[0];
    const images = product.media
      .filter((media) => media.type === 'IMAGE')
      .map((media) => media.url);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      brand: product.brandRel?.name || product.brand || null,
      brandId: product.brandId || null,
      brandRel: product.brandRel || null,
      status: product.status,
      isFeatured: product.isFeatured,
      codAvailable: product.codAvailable,
      deliveryNote: product.deliveryNote,
      returnNote: product.returnNote,
      condition: product.condition,
      conditionGrade: product.conditionGrade,
      conditionNote: product.conditionNote,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      publishedAt: product.publishedAt,
      category: product.category,
      media: product.media,
      youtubeReviews: product.youtubeReviews || [],
      features: product.features || [],
      specifications: product.specifications || [],
      variants,
      variantId: defaultVariant?.id ?? null,
      sku: defaultVariant?.sku ?? null,
      price: defaultVariant?.price ?? 0,
      compareAtPrice: defaultVariant?.compareAtPrice ?? null,
      availableStock: defaultVariant?.availableStock ?? 0,
      image: images[0] ?? null,
      images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async createCategory(dto: CreateCategoryDto, actor: UserPayload) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const category = await transaction.category.create({
          data: {
            name: dto.name.trim(),
            slug: this.resolveSlug(dto.name, dto.slug),
            description: dto.description,
            parentId: dto.parentId,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
          },
        });
        await this.audit.record(
          {
            action: 'CATEGORY_CREATED',
            entityType: 'Category',
            entityId: category.id,
            actor,
            newValue: category,
          },
          transaction,
        );
        return category;
      });
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actor: UserPayload) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
        select: { id: true, parentId: true },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId === id) {
        throw new BadRequestException(
          'Category hierarchy cannot contain a cycle',
        );
      }
    }
    if (dto.isActive === false) {
      const publishedProducts = await this.prisma.product.count({
        where: { categoryId: id, status: 'ACTIVE' },
      });
      if (publishedProducts > 0) {
        throw new ConflictException(
          'Unpublish products in this category before deactivating it',
        );
      }
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.category.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            slug:
              dto.slug !== undefined || dto.name !== undefined
                ? this.resolveSlug(dto.name ?? category.name, dto.slug)
                : undefined,
            description: dto.description?.trim(),
            parentId: dto.parentId,
            sortOrder: dto.sortOrder,
            isActive: dto.isActive,
          },
        });
        await this.audit.record(
          {
            action: 'CATEGORY_UPDATED',
            entityType: 'Category',
            entityId: id,
            actor,
            previousValue: category,
            newValue: updated,
          },
          transaction,
        );
        return updated;
      });
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  async deleteCategory(id: string, actor: UserPayload) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category._count.products > 0) {
      throw new ConflictException(
        'Move or archive products in this category before deleting it',
      );
    }
    if (category._count.children > 0) {
      throw new ConflictException(
        'Move or delete child categories before deleting this category',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const deleted = await transaction.category.delete({ where: { id } });
      await this.audit.record(
        {
          action: 'CATEGORY_DELETED',
          entityType: 'Category',
          entityId: id,
          actor,
          previousValue: deleted,
        },
        transaction,
      );
      return { id: deleted.id, deleted: true };
    });
  }

  async getCategories(publicOnly = false) {
    const db = await this.db();
    return db.category.findMany({
      where: publicOnly ? { isActive: true } : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        sortOrder: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: publicOnly ? { where: { status: 'ACTIVE' } } : true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createBrand(dto: CreateBrandDto, actor: UserPayload) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const brand = await transaction.brand.create({
          data: {
            name: dto.name.trim(),
            slug: this.resolveSlug(dto.name, dto.slug),
            description: dto.description?.trim(),
            logoUrl: dto.logoUrl?.trim(),
            isActive: dto.isActive ?? true,
          },
        });
        await this.audit.record(
          {
            action: 'BRAND_CREATED',
            entityType: 'Brand',
            entityId: brand.id,
            actor,
            newValue: brand,
          },
          transaction,
        );
        return brand;
      });
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  async updateBrand(id: string, dto: UpdateBrandDto, actor: UserPayload) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.brand.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            slug:
              dto.slug !== undefined || dto.name !== undefined
                ? this.resolveSlug(dto.name ?? brand.name, dto.slug)
                : undefined,
            description: dto.description?.trim(),
            logoUrl: dto.logoUrl?.trim(),
            isActive: dto.isActive,
          },
        });
        await this.audit.record(
          {
            action: 'BRAND_UPDATED',
            entityType: 'Brand',
            entityId: id,
            actor,
            previousValue: brand,
            newValue: updated,
          },
          transaction,
        );
        return updated;
      });
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  async deleteBrand(id: string, actor: UserPayload) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    return this.prisma.$transaction(async (transaction) => {
      const deleted = await transaction.brand.delete({ where: { id } });
      await this.audit.record(
        {
          action: 'BRAND_DELETED',
          entityType: 'Brand',
          entityId: id,
          actor,
          previousValue: deleted,
        },
        transaction,
      );
      return { id: deleted.id, deleted: true };
    });
  }

  async getBrands(query?: BrandQueryDto, publicOnly = false) {
    const search = query?.search?.trim();
    const categoryId = query?.categoryId?.trim();

    const db = await this.db();
    return db.brand.findMany({
      where: {
        ...(publicOnly ? { isActive: true } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(categoryId
          ? {
              products: {
                some: {
                  OR: [
                    { categoryId },
                    { category: { parentId: categoryId } },
                  ],
                },
              },
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            products: publicOnly ? { where: { status: 'ACTIVE' } } : true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(dto: CreateProductDto, actor: UserPayload) {
    dto.variants.forEach((variant) =>
      this.ensureValidPrice(variant.price, variant.compareAtPrice),
    );
    const condition = dto.condition ?? 'NEW';
    this.ensureConditionDetails(
      condition,
      dto.conditionGrade,
      dto.conditionNote,
    );

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Active category not found');

    try {
      const productId = await this.prisma.$transaction(async (transaction) => {
        const warehouse = await transaction.warehouse.upsert({
          where: { code: 'MAIN' },
          update: { isActive: true },
          create: { code: 'MAIN', name: 'Main Warehouse' },
        });

        let resolvedBrandId: string | null = dto.brandId || null;
        let resolvedBrandName: string | null = dto.brand?.trim() || null;

        if (resolvedBrandId) {
          const brandObj = await transaction.brand.findUnique({
            where: { id: resolvedBrandId },
          });
          if (brandObj) {
            resolvedBrandName = brandObj.name;
          } else {
            resolvedBrandId = null;
          }
        } else if (resolvedBrandName) {
          const existingBrand = await transaction.brand.findFirst({
            where: { name: { equals: resolvedBrandName, mode: 'insensitive' } },
          });
          if (existingBrand) {
            resolvedBrandId = existingBrand.id;
            resolvedBrandName = existingBrand.name;
          }
        }

        const status = dto.status ?? 'DRAFT';
        const product = await transaction.product.create({
          data: {
            name: dto.name.trim(),
            slug: this.resolveSlug(dto.name, dto.slug),
            description: dto.description.trim(),
            categoryId: dto.categoryId,
            brand: resolvedBrandName,
            brandId: resolvedBrandId,
            status,
            isFeatured: dto.isFeatured ?? false,
            codAvailable: dto.codAvailable ?? true,
            deliveryNote: dto.deliveryNote?.trim(),
            returnNote: dto.returnNote?.trim(),
            condition,
            conditionGrade:
              condition === 'SECOND_HAND' ? dto.conditionGrade : null,
            conditionNote:
              condition === 'SECOND_HAND' ? dto.conditionNote?.trim() : null,
            seoTitle: dto.seoTitle?.trim(),
            seoDescription: dto.seoDescription?.trim(),
            publishedAt: status === 'ACTIVE' ? new Date() : null,
            variants: {
              create: dto.variants.map((variant) => ({
                name: variant.name.trim(),
                sku: variant.sku.trim().toUpperCase(),
                attributes: variant.attributes as
                  | Prisma.InputJsonValue
                  | undefined,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                isActive: variant.isActive ?? true,
                sortOrder: variant.sortOrder ?? 0,
                weightGrams: variant.weightGrams,
              })),
            },
            media: dto.media?.length
              ? {
                  create: dto.media.map((media) => ({
                    url: media.url,
                    altText: media.altText?.trim() || dto.name.trim(),
                    type: media.type ?? 'IMAGE',
                    sortOrder: media.sortOrder ?? 0,
                  })),
                }
              : undefined,
            features: dto.features?.length
              ? {
                  create: dto.features.map((feature, index) => ({
                    title: feature.title.trim(),
                    description: feature.description.trim(),
                    image: feature.image?.trim() || null,
                    tag: feature.tag?.trim() || null,
                    sortOrder: feature.sortOrder ?? index,
                  })),
                }
              : undefined,
            specifications: dto.specifications?.length
              ? {
                  create: dto.specifications.map((spec, index) => ({
                    group: spec.group?.trim() || 'General',
                    key: spec.key.trim(),
                    value: spec.value.trim(),
                    sortOrder: spec.sortOrder ?? index,
                  })),
                }
              : undefined,
          },
          include: { variants: true },
        });

        for (const variant of product.variants) {
          const input = dto.variants.find(
            (item) => item.sku.trim().toUpperCase() === variant.sku,
          );
          const initialStock = input?.initialStock ?? 0;
          const inventory = await transaction.inventoryStock.create({
            data: {
              warehouseId: warehouse.id,
              variantId: variant.id,
              onHand: initialStock,
              lowStockThreshold: input?.lowStockThreshold ?? 5,
            },
          });
          if (initialStock > 0) {
            await transaction.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                type: 'INITIAL_STOCK',
                quantityDelta: initialStock,
                reason: 'Initial stock entered during product creation',
                referenceType: 'PRODUCT',
                referenceId: product.id,
                actorId: actor.userId,
              },
            });
          }
        }

        if (dto.youtubeReviews && dto.youtubeReviews.length > 0) {
          for (const review of dto.youtubeReviews) {
            if (!review.youtubeUrl?.trim()) continue;
            const videoId = this.extractYoutubeVideoId(review.youtubeUrl);
            await transaction.productYoutubeReview.create({
              data: {
                productId: product.id,
                youtubeUrl: review.youtubeUrl.trim(),
                youtubeVideoId: videoId,
                title: review.title?.trim() || null,
                reviewerName:
                  review.reviewerName?.trim() || actor.email || 'Admin',
                status: 'APPROVED',
                isFeatured: review.isFeatured ?? false,
                submittedById: actor.userId,
                moderatedById: actor.userId,
                moderatedAt: new Date(),
              },
            });
          }
        }

        await this.audit.record(
          {
            action: 'PRODUCT_CREATED',
            entityType: 'Product',
            entityId: product.id,
            actor,
            newValue: {
              id: product.id,
              name: dto.name,
              slug: product.slug,
              status: product.status,
              categoryId: product.categoryId,
              variantCount: product.variants.length,
            },
          },
          transaction,
        );

        return product.id;
      });

      return this.getAdminProductById(productId);
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto, actor: UserPayload) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const condition = dto.condition ?? existing.condition;
    const conditionGrade =
      condition === 'SECOND_HAND'
        ? (dto.conditionGrade ?? existing.conditionGrade)
        : null;
    const conditionNote =
      condition === 'SECOND_HAND'
        ? (dto.conditionNote ?? existing.conditionNote)
        : null;
    this.ensureConditionDetails(condition, conditionGrade, conditionNote);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Active category not found');
    }
    dto.variants?.forEach((variant) =>
      this.ensureValidPrice(variant.price, variant.compareAtPrice),
    );
    if (
      existing.status === 'ACTIVE' &&
      dto.variants &&
      !dto.variants.some((variant) => variant.isActive !== false)
    ) {
      throw new ConflictException(
        'A published product requires at least one active variant',
      );
    }

    try {
      await this.prisma.$transaction(async (transaction) => {
        let resolvedBrandId: string | null | undefined = dto.brandId;
        let resolvedBrandName: string | null | undefined = dto.brand?.trim();

        if (resolvedBrandId) {
          const brandObj = await transaction.brand.findUnique({
            where: { id: resolvedBrandId },
          });
          if (brandObj) {
            resolvedBrandName = brandObj.name;
          } else {
            resolvedBrandId = null;
          }
        } else if (resolvedBrandName) {
          const existingBrand = await transaction.brand.findFirst({
            where: { name: { equals: resolvedBrandName, mode: 'insensitive' } },
          });
          if (existingBrand) {
            resolvedBrandId = existingBrand.id;
            resolvedBrandName = existingBrand.name;
          }
        }

        await transaction.product.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            slug: dto.slug,
            description: dto.description?.trim(),
            categoryId: dto.categoryId,
            brand: resolvedBrandName !== undefined ? resolvedBrandName : undefined,
            brandId: resolvedBrandId !== undefined ? resolvedBrandId : undefined,
            isFeatured: dto.isFeatured,
            codAvailable: dto.codAvailable,
            deliveryNote: dto.deliveryNote?.trim(),
            returnNote: dto.returnNote?.trim(),
            condition,
            conditionGrade,
            conditionNote: conditionNote?.trim() ?? null,
            seoTitle: dto.seoTitle?.trim(),
            seoDescription: dto.seoDescription?.trim(),
          },
        });

        if (dto.media) {
          await transaction.productMedia.deleteMany({
            where: { productId: id },
          });
          if (dto.media.length > 0) {
            await transaction.productMedia.createMany({
              data: dto.media.map((media) => ({
                productId: id,
                url: media.url,
                altText: media.altText?.trim() || dto.name || existing.name,
                type: media.type ?? 'IMAGE',
                sortOrder: media.sortOrder ?? 0,
              })),
            });
          }
        }

        if (dto.variants) {
          const existingVariantIds = new Set(
            existing.variants.map((variant) => variant.id),
          );
          const warehouse = await transaction.warehouse.upsert({
            where: { code: 'MAIN' },
            update: { isActive: true },
            create: { code: 'MAIN', name: 'Main Warehouse' },
          });

          for (const variant of dto.variants) {
            const data = {
              name: variant.name.trim(),
              sku: variant.sku.trim().toUpperCase(),
              attributes: variant.attributes as
                | Prisma.InputJsonValue
                | undefined,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              isActive: variant.isActive ?? true,
              sortOrder: variant.sortOrder ?? 0,
              weightGrams: variant.weightGrams,
            };

            if (variant.id) {
              if (!existingVariantIds.has(variant.id)) {
                throw new NotFoundException(
                  `Variant does not belong to product: ${variant.id}`,
                );
              }
              await transaction.productVariant.update({
                where: { id: variant.id },
                data,
              });
              if (variant.lowStockThreshold !== undefined) {
                await transaction.inventoryStock.updateMany({
                  where: { variantId: variant.id },
                  data: { lowStockThreshold: variant.lowStockThreshold },
                });
              }
              continue;
            }

            const createdVariant = await transaction.productVariant.create({
              data: { ...data, productId: id },
            });
            const initialStock = variant.initialStock ?? 0;
            const inventory = await transaction.inventoryStock.create({
              data: {
                warehouseId: warehouse.id,
                variantId: createdVariant.id,
                onHand: initialStock,
                lowStockThreshold: variant.lowStockThreshold ?? 5,
              },
            });
            if (initialStock > 0) {
              await transaction.inventoryMovement.create({
                data: {
                  inventoryId: inventory.id,
                  type: 'INITIAL_STOCK',
                  quantityDelta: initialStock,
                  reason: 'Initial stock entered when variant was added',
                  referenceType: 'PRODUCT',
                  referenceId: id,
                  actorId: actor.userId,
                },
              });
            }
          }
        }

        if (dto.youtubeReviews !== undefined) {
          await transaction.productYoutubeReview.deleteMany({
            where: { productId: id },
          });
          for (const review of dto.youtubeReviews) {
            if (!review.youtubeUrl?.trim()) continue;
            const videoId = this.extractYoutubeVideoId(review.youtubeUrl);
            await transaction.productYoutubeReview.create({
              data: {
                productId: id,
                youtubeUrl: review.youtubeUrl.trim(),
                youtubeVideoId: videoId,
                title: review.title?.trim() || null,
                reviewerName:
                  review.reviewerName?.trim() || actor.email || 'Admin',
                status: 'APPROVED',
                isFeatured: review.isFeatured ?? false,
                submittedById: actor.userId,
                moderatedById: actor.userId,
                moderatedAt: new Date(),
              },
            });
          }
        }

        if (dto.features !== undefined) {
          await transaction.productFeature.deleteMany({
            where: { productId: id },
          });
          if (dto.features.length > 0) {
            await transaction.productFeature.createMany({
              data: dto.features.map((feature, index) => ({
                productId: id,
                title: feature.title.trim(),
                description: feature.description.trim(),
                image: feature.image?.trim() || null,
                tag: feature.tag?.trim() || null,
                sortOrder: feature.sortOrder ?? index,
              })),
            });
          }
        }

        if (dto.specifications !== undefined) {
          await transaction.productSpecification.deleteMany({
            where: { productId: id },
          });
          if (dto.specifications.length > 0) {
            await transaction.productSpecification.createMany({
              data: dto.specifications.map((spec, index) => ({
                productId: id,
                group: spec.group?.trim() || 'General',
                key: spec.key.trim(),
                value: spec.value.trim(),
                sortOrder: spec.sortOrder ?? index,
              })),
            });
          }
        }

        await this.audit.record(
          {
            action: 'PRODUCT_UPDATED',
            entityType: 'Product',
            entityId: id,
            actor,
            previousValue: existing,
            newValue: dto,
          },
          transaction,
        );
      });

      return this.getAdminProductById(id);
    } catch (error) {
      this.handlePrismaConflict(error);
    }
  }

  private buildProductWhere(
    query: ProductQueryDto | AdminProductQueryDto,
    publicOnly: boolean,
  ): Prisma.ProductWhereInput {
    const search = query.search?.trim();
    const adminStatus = 'status' in query ? query.status : undefined;
    const variantWhere: Prisma.ProductVariantWhereInput = {
      ...(publicOnly ? { isActive: true } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              gte: query.minPrice,
              lte: query.maxPrice,
            },
          }
        : {}),
      ...(query.inStock === 'true'
        ? { inventory: { some: { onHand: { gt: 0 } } } }
        : {}),
      ...(query.attributeKey && query.attributeValue
        ? {
            attributes: {
              path: [query.attributeKey],
              equals: query.attributeValue,
            },
          }
        : {}),
    };

    return {
      ...(publicOnly
        ? {
            status: 'ACTIVE',
            publishedAt: { lte: new Date() },
          }
        : adminStatus
          ? { status: adminStatus }
          : {}),
      ...(Object.keys(variantWhere).length > 0
        ? { variants: { some: variantWhere } }
        : {}),
      ...(query.category
        ? {
            category: {
              slug: query.category,
              ...(publicOnly ? { isActive: true } : {}),
            },
          }
        : {}),
      ...(query.featured ? { isFeatured: query.featured === 'true' } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { category: { name: { contains: search, mode: 'insensitive' } } },
              {
                variants: {
                  some: { sku: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
  }

  async getProducts(
    query: ProductQueryDto | AdminProductQueryDto,
    publicOnly: boolean,
  ) {
    const db = await this.db();
    const page = query.page || 1;
    const limit = Math.min(query.limit || 24, 100);
    const where = this.buildProductWhere(query, publicOnly);
    const isPriceSort =
      query.sort === 'price-asc' || query.sort === 'price-desc';
    // Application-side pagination (price sort / stock filter) must stay
    // bounded: cap the candidate window so a large catalog cannot force a
    // full-table scan into memory per request.
    const APPLICATION_PAGINATION_WINDOW = 2000;
    const needsApplicationPagination = isPriceSort || query.inStock === 'true';
    const [products, databaseTotal] = await Promise.all([
      db.product.findMany({
        where,
        include: productInclude,
        orderBy:
          query.sort === 'name-asc'
            ? { name: 'asc' }
            : [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: needsApplicationPagination ? undefined : (page - 1) * limit,
        take: needsApplicationPagination
          ? APPLICATION_PAGINATION_WINDOW
          : limit,
      }),
      db.product.count({ where }),
    ]);
    let serialized = products.map((product) =>
      this.serializeProduct(product, publicOnly),
    );
    if (query.inStock === 'true') {
      serialized = serialized.filter((product) => product.availableStock > 0);
    }
    if (isPriceSort) {
      serialized.sort((first, second) =>
        query.sort === 'price-asc'
          ? first.price - second.price
          : second.price - first.price,
      );
    }
    const items = needsApplicationPagination
      ? serialized.slice((page - 1) * limit, page * limit)
      : serialized;
    const total = query.inStock === 'true' ? serialized.length : databaseTotal;

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      results: items,
      data: items,
      page,
      limit,
      total,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getPublicProductBySlug(slug: string) {
    const db = await this.db();
    const product = await db.product.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        publishedAt: { lte: new Date() },
        variants: { some: { isActive: true } },
      },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.serializeProduct(product, true);
  }

  async getAdminProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.serializeProduct(product);
  }

  async updateProductStatus(
    id: string,
    dto: UpdateProductStatusDto,
    actor: UserPayload,
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        category: { select: { isActive: true } },
        variants: {
          where: { isActive: true },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (
      dto.status === 'ACTIVE' &&
      (!existing.category.isActive || existing.variants.length === 0)
    ) {
      throw new ConflictException(
        'A published product requires an active category and variant',
      );
    }
    const product = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.product.update({
        where: { id },
        data: {
          status: dto.status,
          publishedAt: dto.status === 'ACTIVE' ? new Date() : null,
        },
        include: productInclude,
      });
      await this.audit.record(
        {
          action: 'PRODUCT_STATUS_CHANGED',
          entityType: 'Product',
          entityId: id,
          actor,
          previousValue: { status: existing.status },
          newValue: {
            status: updated.status,
            publishedAt: updated.publishedAt,
          },
        },
        transaction,
      );
      return updated;
    });
    return this.serializeProduct(product);
  }

  async getInventory(query: InventoryQueryDto) {
    const search = query.search?.trim();
    const stocks = await this.prisma.inventoryStock.findMany({
      where: {
        warehouse: { code: 'MAIN' },
        variant: {
          product: { status: { not: 'ARCHIVED' } },
          ...(search
            ? {
                OR: [
                  { sku: { contains: search, mode: 'insensitive' } },
                  {
                    product: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                ],
              }
            : {}),
        },
      },
      include: {
        warehouse: true,
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
        _count: { select: { movements: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { variant: { sku: 'asc' } }],
      // Bounded scan: inventory views must not load an unbounded table.
      take: 2000,
    });
    const rows = stocks
      .map((stock) => {
        const available = Math.max(
          0,
          stock.onHand - stock.reserved - stock.damaged,
        );
        return {
          id: stock.id,
          variantId: stock.variantId,
          sku: stock.variant.sku,
          variantName: stock.variant.name,
          product: stock.variant.product,
          warehouse: {
            id: stock.warehouse.id,
            code: stock.warehouse.code,
            name: stock.warehouse.name,
          },
          onHand: stock.onHand,
          reserved: stock.reserved,
          damaged: stock.damaged,
          incoming: stock.incoming,
          available,
          lowStockThreshold: stock.lowStockThreshold,
          isLowStock: available <= stock.lowStockThreshold,
          hasDiscrepancy:
            stock.onHand < stock.reserved + stock.damaged ||
            stock.onHand < 0 ||
            stock.reserved < 0 ||
            stock.damaged < 0,
          movementCount: stock._count.movements,
          updatedAt: stock.updatedAt,
        };
      })
      .filter((stock) => query.lowStock !== 'true' || stock.isLowStock);
    const page = query.page || 1;
    const limit = query.limit || 30;
    const sliced = rows.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(rows.length / limit) || 1;

    return {
      items: sliced,
      results: sliced,
      data: sliced,
      page,
      limit,
      total: rows.length,
      totalPages,
      pagination: {
        total: rows.length,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        lowStock: rows.filter((stock) => stock.isLowStock).length,
        discrepancies: rows.filter((stock) => stock.hasDiscrepancy).length,
      },
    };
  }

  async getInventoryMovements(variantId: string, limit = 30) {
    const inventory = await this.prisma.inventoryStock.findFirst({
      where: { variantId, warehouse: { code: 'MAIN' } },
      select: { id: true },
    });
    if (!inventory) throw new NotFoundException('Inventory record not found');

    return this.prisma.inventoryMovement.findMany({
      where: { inventoryId: inventory.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async adjustInventory(
    variantId: string,
    dto: AdjustInventoryDto,
    actor: UserPayload,
  ) {
    if (dto.quantityDelta === 0) {
      throw new BadRequestException('Inventory adjustment cannot be zero');
    }
    const effectiveAt = this.validateInventoryAdjustment(dto);

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const inventory = await transaction.inventoryStock.findFirst({
            where: { variantId, warehouse: { code: 'MAIN' } },
          });
          if (!inventory)
            throw new NotFoundException('Inventory record not found');

          const nextOnHand = inventory.onHand + dto.quantityDelta;
          if (nextOnHand < inventory.reserved + inventory.damaged) {
            throw new ConflictException(
              'Adjustment would make available inventory negative',
            );
          }

          const updated = await transaction.inventoryStock.update({
            where: { id: inventory.id },
            data: { onHand: nextOnHand },
          });
          await transaction.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: this.inventoryMovementType(dto.adjustmentReason),
              quantityDelta: dto.quantityDelta,
              reason: dto.reason.trim(),
              referenceType: dto.referenceType?.trim() || 'VARIANT',
              referenceId: dto.referenceId?.trim() || variantId,
              adjustmentReason: dto.adjustmentReason,
              unitCost: dto.unitCost,
              evidenceUrl: dto.evidenceUrl?.trim(),
              effectiveAt,
              actorId: actor.userId,
            },
          });

          await this.audit.record(
            {
              action: 'INVENTORY_ADJUSTED',
              entityType: 'ProductVariant',
              entityId: variantId,
              actor,
              previousValue: { onHand: inventory.onHand },
              newValue: { onHand: updated.onHand },
              metadata: {
                quantityDelta: dto.quantityDelta,
                reason: dto.reason.trim(),
                adjustmentReason: dto.adjustmentReason,
                referenceType: dto.referenceType?.trim() || 'VARIANT',
                referenceId: dto.referenceId?.trim() || variantId,
                unitCost: dto.unitCost,
                evidenceUrl: dto.evidenceUrl?.trim(),
                effectiveAt,
                inventoryId: inventory.id,
              },
            },
            transaction,
          );

          return {
            ...updated,
            available: Math.max(
              0,
              updated.onHand - updated.reserved - updated.damaged,
            ),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Stock changed while adjusting; retry');
      }
      throw error;
    }
  }
}
