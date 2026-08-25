import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { assertTenantCommerceWritable } from '../../tenancy/commerce-write-guard.util';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { ConfigService } from '@nestjs/config';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

const CART_LIFETIME_DAYS = 30;

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          inventory: true,
          product: {
            include: {
              category: true,
              media: { orderBy: { sortOrder: 'asc' as const } },
              variants: {
                orderBy: { sortOrder: 'asc' as const },
                include: { inventory: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

type SellableVariant = Prisma.ProductVariantGetPayload<{
  include: {
    inventory: true;
    product: { include: { category: true } };
  };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7 slice 3: guest/authenticated carts resolve against the tenant
   * database inside storefront requests (guest tokens are therefore
   * inherently tenant-local under database-per-tenant). Outside resolved
   * requests the legacy single-tenant DB applies, unchanged.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CART_LIFETIME_DAYS);
    return expiresAt;
  }

  private emptyCart() {
    return {
      id: null,
      items: [],
      subtotal: 0,
      itemCount: 0,
      isValid: true,
      expiresAt: null,
    };
  }

  private availableStock(variant: SellableVariant): number {
    return variant.inventory.reduce(
      (total, stock) =>
        total + Math.max(0, stock.onHand - stock.reserved - stock.damaged),
      0,
    );
  }

  private assertSellable(variant: SellableVariant, quantity: number): number {
    const now = new Date();
    if (
      !variant.isActive ||
      variant.product.status !== 'ACTIVE' ||
      !variant.product.category.isActive ||
      !variant.product.publishedAt ||
      variant.product.publishedAt > now
    ) {
      throw new ConflictException('This product is not currently available');
    }
    const available = this.availableStock(variant);
    if (available < quantity) {
      throw new ConflictException(
        available === 0
          ? 'This variant is out of stock'
          : `Only ${available} units are currently available`,
      );
    }
    return available;
  }

  private async getSellableVariant(variantId: string) {
    const db = await this.db();
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: { include: { category: true } },
      },
    });
    if (!variant) throw new NotFoundException('Product variant not found');
    return variant;
  }

  private async findActiveCart(
    token?: string,
    userId?: string,
  ): Promise<CartRecord | null> {
    const db = await this.db();
    if (token && token.length <= 512) {
      const cart = await db.cart.findFirst({
        where: {
          tokenHash: this.tokenHash(token),
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        include: cartInclude,
      });
      if (cart) return cart;
    }
    if (userId) {
      return db.cart.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        orderBy: { updatedAt: 'desc' },
        include: cartInclude,
      });
    }
    return null;
  }

  private async loadCart(id: string): Promise<CartRecord> {
    const db = await this.db();
    const cart = await db.cart.findUnique({
      where: { id },
      include: cartInclude,
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  private serializeCart(cart: CartRecord) {
    const now = new Date();
    const items = cart.items.map((item) => {
      const product = item.variant.product;
      const availableStock = item.variant.inventory.reduce(
        (total, stock) =>
          total + Math.max(0, stock.onHand - stock.reserved - stock.damaged),
        0,
      );
      const issues: Array<{
        code: string;
        message: string;
        severity: 'warning' | 'blocking';
      }> = [];
      const productUnavailable =
        product.status !== 'ACTIVE' ||
        !product.category.isActive ||
        !product.publishedAt ||
        product.publishedAt > now;
      if (productUnavailable) {
        issues.push({
          code: 'PRODUCT_UNAVAILABLE',
          message: 'This product is no longer available.',
          severity: 'blocking',
        });
      } else if (!item.variant.isActive) {
        issues.push({
          code: 'VARIANT_UNAVAILABLE',
          message: 'This variant is no longer available.',
          severity: 'blocking',
        });
      }
      if (availableStock === 0) {
        issues.push({
          code: 'OUT_OF_STOCK',
          message: 'This variant is out of stock.',
          severity: 'blocking',
        });
      } else if (item.quantity > availableStock) {
        issues.push({
          code: 'QUANTITY_UNAVAILABLE',
          message: `Only ${availableStock} units are currently available.`,
          severity: 'blocking',
        });
      }
      if (item.addedUnitPrice !== item.variant.price) {
        issues.push({
          code: 'PRICE_CHANGED',
          message: 'The price changed after this item was added.',
          severity: 'warning',
        });
      }
      const image = product.media.find((media) => media.type === 'IMAGE')?.url;
      const availableVariants = (product.variants ?? []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        attributes: variant.attributes,
        price: variant.price,
        availableStock: variant.inventory.reduce(
          (total, stock) =>
            total + Math.max(0, stock.onHand - stock.reserved - stock.damaged),
          0,
        ),
        isActive: variant.isActive,
      }));

      return {
        id: item.id,
        productId: product.id,
        variantId: item.variantId,
        slug: product.slug,
        productName: product.name,
        variantName: item.variant.name,
        sku: item.variant.sku,
        codAvailable: product.codAvailable,
        condition: product.condition,
        conditionGrade: product.conditionGrade,
        image: image ?? null,
        quantity: item.quantity,
        addedUnitPrice: item.addedUnitPrice,
        currentUnitPrice: item.variant.price,
        lineTotal: item.variant.price * item.quantity,
        availableStock,
        availableVariants,
        issues,
      };
    });

    return {
      id: cart.id,
      items,
      subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      isValid: items.every((item) =>
        item.issues.every((issue) => issue.severity !== 'blocking'),
      ),
      expiresAt: cart.expiresAt,
    };
  }

  async getCart(token?: string) {
    const cart = await this.findActiveCart(token);
    return cart ? this.serializeCart(cart) : this.emptyCart();
  }

  async listAbandonedCartEligibility() {
    const db = await this.db();
    const now = new Date();
    const minimumAgeHours = Math.max(
      1,
      this.config?.get<number>('ABANDONED_CART_MIN_AGE_HOURS', 2) ?? 2,
    );
    const consentMaxAgeDays = Math.max(
      1,
      this.config?.get<number>('MARKETING_CONSENT_MAX_AGE_DAYS', 365) ?? 365,
    );
    const inactiveBefore = new Date(
      now.getTime() - minimumAgeHours * 60 * 60 * 1000,
    );
    const consentAfter = new Date(
      now.getTime() - consentMaxAgeDays * 24 * 60 * 60 * 1000,
    );
    const carts = await db.cart.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
        updatedAt: { lte: inactiveBefore },
        userId: { not: null },
        items: { some: {} },
        user: {
          is: {
            role: 'user',
            isDeleted: false,
            isEmailVerified: true,
            email: { not: '' },
          },
        },
        checkoutDraft: {
          is: {
            marketingConsent: true,
            marketingConsentAt: { gte: consentAfter, lte: now },
            order: { is: null },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        updatedAt: true,
        expiresAt: true,
        user: { select: { id: true, name: true, email: true } },
        checkoutDraft: {
          select: { marketingConsentAt: true, subtotal: true },
        },
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                id: true,
                name: true,
                price: true,
                product: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });
    return {
      generatedAt: now,
      policy: { minimumAgeHours, consentMaxAgeDays },
      items: carts.map((cart) => ({
        ...cart,
        eligibility: {
          identityVerified: true,
          consentRecorded: true,
          contactChannel: 'EMAIL' as const,
        },
      })),
    };
  }

  async mergeGuestCart(userId: string, token?: string) {
    const db = await this.db();
    const target = await this.findActiveCart(token);
    if (!target) return { ...this.emptyCart(), mergedCartCount: 0 };
    if (target.userId && target.userId !== userId) {
      throw new ConflictException('This cart belongs to another account');
    }

    const mergedCartCount = await db.$transaction(
      async (transaction) => {
        const sources = await transaction.cart.findMany({
          where: {
            userId,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
            id: { not: target.id },
          },
          include: cartInclude,
        });
        const quantities = new Map(
          target.items.map((item) => [item.variantId, item.quantity]),
        );
        for (const source of sources) {
          for (const item of source.items) {
            const quantity = Math.min(
              this.availableStock(item.variant),
              (quantities.get(item.variantId) ?? 0) + item.quantity,
            );
            if (quantity <= 0) continue;
            await transaction.cartItem.upsert({
              where: {
                cartId_variantId: {
                  cartId: target.id,
                  variantId: item.variantId,
                },
              },
              update: { quantity, addedUnitPrice: item.variant.price },
              create: {
                cartId: target.id,
                variantId: item.variantId,
                quantity,
                addedUnitPrice: item.variant.price,
              },
            });
            quantities.set(item.variantId, quantity);
          }
        }
        await transaction.checkoutDraft.deleteMany({
          where: { cartId: target.id },
        });
        await transaction.cart.update({
          where: { id: target.id },
          data: { userId, expiresAt: this.expiresAt() },
        });
        if (sources.length) {
          await transaction.cart.updateMany({
            where: { id: { in: sources.map((source) => source.id) } },
            data: { status: 'ABANDONED' },
          });
        }
        return sources.length;
      },
    );

    return {
      ...this.serializeCart(await this.loadCart(target.id)),
      mergedCartCount,
    };
  }

  async addItem(dto: AddCartItemDto, token?: string) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const variant = await this.getSellableVariant(dto.variantId);
    const existingCart = await this.findActiveCart(token);
    const existingItem = existingCart?.items.find(
      (item) => item.variantId === dto.variantId,
    );
    const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
    this.assertSellable(variant, nextQuantity);

    let cartId = existingCart?.id;
    let effectiveToken = token;
    await db.$transaction(async (transaction) => {
      if (!cartId) {
        effectiveToken = randomBytes(32).toString('base64url');
        const cart = await transaction.cart.create({
          data: {
            tokenHash: this.tokenHash(effectiveToken),
            expiresAt: this.expiresAt(),
          },
        });
        cartId = cart.id;
      }
      await transaction.cartItem.upsert({
        where: {
          cartId_variantId: { cartId, variantId: dto.variantId },
        },
        update: {
          quantity: nextQuantity,
          addedUnitPrice: variant.price,
        },
        create: {
          cartId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          addedUnitPrice: variant.price,
        },
      });
      await transaction.cart.update({
        where: { id: cartId },
        data: { expiresAt: this.expiresAt() },
      });
    });

    if (!cartId || !effectiveToken) {
      throw new ConflictException('Unable to create a persistent cart');
    }

    return {
      ...this.serializeCart(await this.loadCart(cartId)),
      cartToken: effectiveToken,
    };
  }

  async updateItem(variantId: string, dto: UpdateCartItemDto, token?: string) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const cart = await this.findActiveCart(token);
    if (!cart) throw new NotFoundException('Active cart not found');
    const item = cart.items.find((entry) => entry.variantId === variantId);
    if (!item) throw new NotFoundException('Cart item not found');
    const replacementVariantId = dto.replacementVariantId ?? variantId;
    const variant = await this.getSellableVariant(replacementVariantId);
    if (variant.productId !== item.variant.productId) {
      throw new ConflictException(
        'A cart item can only switch to another variant of the same product',
      );
    }
    const targetItem = cart.items.find(
      (entry) => entry.variantId === replacementVariantId,
    );
    const nextQuantity =
      targetItem && targetItem.id !== item.id
        ? targetItem.quantity + dto.quantity
        : dto.quantity;
    this.assertSellable(variant, nextQuantity);

    await db.$transaction(async (transaction) => {
      if (targetItem && targetItem.id !== item.id) {
        await transaction.cartItem.update({
          where: { id: targetItem.id },
          data: { quantity: nextQuantity, addedUnitPrice: variant.price },
        });
        await transaction.cartItem.delete({ where: { id: item.id } });
      } else {
        await transaction.cartItem.update({
          where: { id: item.id },
          data: {
            variantId: replacementVariantId,
            quantity: dto.quantity,
            addedUnitPrice: variant.price,
          },
        });
      }
      await transaction.cart.update({
        where: { id: cart.id },
        data: { expiresAt: this.expiresAt() },
      });
    });
    return this.serializeCart(await this.loadCart(cart.id));
  }

  async removeItem(variantId: string, token?: string) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const cart = await this.findActiveCart(token);
    if (!cart) throw new NotFoundException('Active cart not found');
    const item = cart.items.find((entry) => entry.variantId === variantId);
    if (!item) throw new NotFoundException('Cart item not found');
    await db.cartItem.delete({ where: { id: item.id } });
    return this.serializeCart(await this.loadCart(cart.id));
  }

  async validateCart(token?: string) {
    const cart = await this.findActiveCart(token);
    if (!cart) throw new NotFoundException('Active cart not found');
    return this.serializeCart(cart);
  }

  private serializeSavedCart(savedCart: any) {
    const now = new Date();
    const items = (savedCart.items || []).map((item: any) => {
      const product = item.variant?.product;
      const availableStock = item.variant
        ? item.variant.inventory.reduce(
            (total: number, stock: any) =>
              total + Math.max(0, stock.onHand - stock.reserved - stock.damaged),
            0,
          )
        : 0;

      const isAvailable =
        !!item.variant &&
        item.variant.isActive &&
        product &&
        product.status === 'ACTIVE' &&
        product.category?.isActive &&
        product.publishedAt &&
        new Date(product.publishedAt) <= now &&
        availableStock > 0;

      const image = product?.media?.find((m: any) => m.type === 'IMAGE')?.url;

      return {
        id: item.id,
        variantId: item.variantId,
        productId: product?.id,
        slug: product?.slug,
        productName: product?.name || 'Unavailable Product',
        variantName: item.variant?.name || 'Default',
        price: item.variant?.price || 0,
        image: image || null,
        quantity: item.quantity,
        availableStock,
        isAvailable,
      };
    });

    const subtotal = items.reduce(
      (total: number, item: any) => total + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce(
      (total: number, item: any) => total + item.quantity,
      0,
    );

    return {
      id: savedCart.id,
      name: savedCart.name,
      shareToken: savedCart.shareToken,
      userId: savedCart.userId,
      userName: savedCart.user?.name,
      items,
      subtotal,
      itemCount,
      createdAt: savedCart.createdAt,
      updatedAt: savedCart.updatedAt,
    };
  }

  async saveActiveCart(name?: string, userId?: string, token?: string) {
    const db = await this.db();
    const cart = await this.findActiveCart(token, userId);
    if (!cart || cart.items.length === 0) {
      throw new ConflictException('Your cart is empty. Add items before saving.');
    }

    const defaultName = `Saved Cart (${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })})`;
    const finalName = name?.trim() || defaultName;

    const shareToken = randomBytes(16).toString('hex');
    const savedCart = await db.savedCart.create({
      data: {
        name: finalName,
        shareToken,
        userId: userId ?? null,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    category: true,
                    media: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.serializeSavedCart(savedCart);
  }

  async getSavedCarts(userId: string) {
    const db = await this.db();
    const savedCarts = await db.savedCart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    category: true,
                    media: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return savedCarts.map((sc) => this.serializeSavedCart(sc));
  }

  async getSharedCart(shareToken: string) {
    const db = await this.db();
    const savedCart = await db.savedCart.findUnique({
      where: { shareToken },
      include: {
        user: { select: { id: true, name: true } },
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    category: true,
                    media: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!savedCart) throw new NotFoundException('Shared cart not found');
    return this.serializeSavedCart(savedCart);
  }

  async importSharedCart(shareToken: string, token?: string) {
    const db = await this.db();
    const savedCart = await db.savedCart.findUnique({
      where: { shareToken },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: { include: { category: true } },
              },
            },
          },
        },
      },
    });

    if (!savedCart) throw new NotFoundException('Shared cart not found');

    const addedItems: any[] = [];
    const unavailableItems: any[] = [];
    let effectiveToken = token;

    for (const item of savedCart.items) {
      try {
        const result = await this.addItem(
          { variantId: item.variantId, quantity: item.quantity },
          effectiveToken,
        );
        effectiveToken = result.cartToken ?? effectiveToken;
        addedItems.push({
          variantId: item.variantId,
          productName: item.variant.product.name,
          variantName: item.variant.name,
          quantity: item.quantity,
        });
      } catch (err: any) {
        unavailableItems.push({
          variantId: item.variantId,
          productName: item.variant?.product?.name ?? 'Unknown Product',
          variantName: item.variant?.name ?? 'Unknown Variant',
          reason: err.message || 'Item unavailable or out of stock',
        });
      }
    }

    const currentCart = await this.getCart(effectiveToken);
    return {
      cart: currentCart,
      cartToken: effectiveToken,
      addedItems,
      unavailableItems,
      summary: `Added ${addedItems.length} items to your cart.${
        unavailableItems.length > 0
          ? ` ${unavailableItems.length} items were unavailable.`
          : ''
      }`,
    };
  }

  async copySharedCartToAccount(shareToken: string, userId: string) {
    const db = await this.db();
    const source = await db.savedCart.findUnique({
      where: { shareToken },
      include: { items: true },
    });
    if (!source) throw new NotFoundException('Shared cart not found');

    const newShareToken = randomBytes(16).toString('hex');
    const newSavedCart = await db.savedCart.create({
      data: {
        name: `${source.name} (Saved)`,
        shareToken: newShareToken,
        userId,
        items: {
          create: source.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    category: true,
                    media: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.serializeSavedCart(newSavedCart);
  }

  async deleteSavedCart(id: string, userId: string) {
    const db = await this.db();
    const savedCart = await db.savedCart.findFirst({
      where: { id, userId },
    });
    if (!savedCart) throw new NotFoundException('Saved cart not found');
    await db.savedCart.delete({ where: { id } });
    return { success: true, message: 'Saved cart deleted' };
  }

  async reorderFromOrder(
    orderId: string,
    orderItemIds?: string[],
    token?: string,
    actor?: { userId: string },
  ) {
    const db = await this.db();
    // Ownership: only the account linked to the order's customer profile may
    // reorder it. Unauthenticated callers can no longer enumerate arbitrary
    // order IDs and echo back their contents.
    const viewer = actor?.userId
      ? await db.user.findUnique({
          where: { id: actor.userId },
          select: { customerId: true },
        })
      : null;
    if (!viewer?.customerId) {
      throw new NotFoundException('Order not found');
    }

    const order = await db.order.findFirst({
      where: { id: orderId, customerId: viewer.customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventory: true,
                product: {
                  include: {
                    category: true,
                    media: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const targetItems = orderItemIds?.length
      ? order.items.filter((i) => orderItemIds.includes(i.id))
      : order.items;

    const addedItems: any[] = [];
    const unavailableItems: any[] = [];
    let effectiveToken = token;

    for (const item of targetItems) {
      if (!item.variantId || !item.variant) {
        unavailableItems.push({
          productName: item.productName,
          variantName: item.variantName,
          reason: 'Product variant is no longer available.',
        });
        continue;
      }

      try {
        const result = await this.addItem(
          { variantId: item.variantId, quantity: item.quantity },
          effectiveToken,
        );
        effectiveToken = result.cartToken ?? effectiveToken;
        addedItems.push({
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
        });
      } catch (err: any) {
        unavailableItems.push({
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          reason: err.message || 'Item unavailable or out of stock',
        });
      }
    }

    const currentCart = await this.getCart(effectiveToken);

    return {
      cart: currentCart,
      cartToken: effectiveToken,
      addedItems,
      unavailableItems,
      summary: `Re-ordered ${addedItems.length} items into your cart.${
        unavailableItems.length > 0
          ? ` ${unavailableItems.length} items could not be added due to stock or availability.`
          : ''
      }`,
    };
  }
}
