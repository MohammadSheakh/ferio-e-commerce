import { ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CartService } from '../cart.service';

describe('CartService', () => {
  it('returns a safe empty cart when no guest token exists', async () => {
    const service = new CartService({} as PrismaService);

    await expect(service.getCart()).resolves.toEqual({
      id: null,
      items: [],
      subtotal: 0,
      itemCount: 0,
      isValid: true,
      expiresAt: null,
    });
  });

  it('rejects adding an unpublished variant', async () => {
    const prisma = {
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'variant-1',
          isActive: true,
          price: 10000,
          inventory: [{ onHand: 10, reserved: 0, damaged: 0 }],
          product: {
            status: 'DRAFT',
            publishedAt: null,
            category: { isActive: true },
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new CartService(prisma);

    await expect(
      service.addItem({ variantId: 'variant-1', quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports repricing and unavailable quantity during revalidation', async () => {
    const prisma = {
      cart: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cart-1',
          tokenHash: 'hash',
          status: 'ACTIVE',
          expiresAt: new Date('2026-09-01T00:00:00.000Z'),
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
          items: [
            {
              id: 'item-1',
              cartId: 'cart-1',
              variantId: 'variant-1',
              quantity: 2,
              addedUnitPrice: 10000,
              createdAt: new Date('2026-08-01T00:00:00.000Z'),
              updatedAt: new Date('2026-08-01T00:00:00.000Z'),
              variant: {
                id: 'variant-1',
                name: 'Medium',
                sku: 'TEST-M',
                price: 12000,
                isActive: true,
                inventory: [{ onHand: 1, reserved: 0, damaged: 0 }],
                product: {
                  id: 'product-1',
                  name: 'Test product',
                  slug: 'test-product',
                  status: 'ACTIVE',
                  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
                  category: { isActive: true },
                  media: [],
                },
              },
            },
          ],
        }),
      },
    } as unknown as PrismaService;
    const service = new CartService(prisma);

    const cart = await service.getCart('guest-token');

    expect(cart.subtotal).toBe(24000);
    expect(cart.isValid).toBe(false);
    expect(cart.items[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'QUANTITY_UNAVAILABLE' }),
        expect.objectContaining({ code: 'PRICE_CHANGED' }),
      ]),
    );
  });

  it('rejects switching a cart line to another product', async () => {
    const prisma = {
      cart: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cart-1',
          items: [
            {
              id: 'item-1',
              variantId: 'variant-1',
              quantity: 1,
              variant: { productId: 'product-1' },
            },
          ],
        }),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'variant-2',
          productId: 'product-2',
          isActive: true,
          price: 10000,
          inventory: [{ onHand: 10, reserved: 0, damaged: 0 }],
          product: {
            status: 'ACTIVE',
            publishedAt: new Date('2026-08-01T00:00:00.000Z'),
            category: { isActive: true },
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new CartService(prisma);

    await expect(
      service.updateItem(
        'variant-1',
        { quantity: 1, replacementVariantId: 'variant-2' },
        'guest-token',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects claiming a cart already owned by another customer', async () => {
    const prisma = {
      cart: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cart-1',
          userId: 'user-2',
          items: [],
        }),
      },
    } as unknown as PrismaService;

    await expect(
      new CartService(prisma).mergeGuestCart('user-1', 'guest-token'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('caps merged quantities, invalidates the draft, and abandons sources', async () => {
    const variant = {
      id: 'variant-1',
      name: 'Default',
      sku: 'SKU-1',
      price: 1000,
      isActive: true,
      inventory: [{ onHand: 3, reserved: 0, damaged: 0 }],
      product: {
        id: 'product-1',
        name: 'Product',
        slug: 'product',
        status: 'ACTIVE',
        publishedAt: new Date('2026-08-01T00:00:00Z'),
        category: { isActive: true },
        media: [],
        variants: [],
      },
    };
    const target = {
      id: 'target',
      userId: null,
      items: [
        {
          id: 'target-item',
          variantId: 'variant-1',
          quantity: 2,
          addedUnitPrice: 1000,
          variant,
        },
      ],
    };
    const source = {
      id: 'source',
      items: [
        {
          id: 'source-item',
          variantId: 'variant-1',
          quantity: 2,
          addedUnitPrice: 1000,
          variant,
        },
      ],
    };
    const transaction = {
      cart: {
        findMany: jest.fn().mockResolvedValue([source]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      cartItem: { upsert: jest.fn() },
      checkoutDraft: { deleteMany: jest.fn() },
    };
    const prisma = {
      cart: {
        findFirst: jest.fn().mockResolvedValue(target),
        findUnique: jest.fn().mockResolvedValue(target),
      },
      $transaction: jest.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;

    const result = await new CartService(prisma).mergeGuestCart(
      'user-1',
      'guest-token',
    );

    expect(transaction.cartItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { quantity: 3, addedUnitPrice: 1000 },
      }),
    );
    expect(transaction.checkoutDraft.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'target' },
    });
    expect(transaction.cart.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ABANDONED' } }),
    );
    expect(result.mergedCartCount).toBe(1);
  });

  it('requires verified identity, current consent, inactivity, and no order for eligibility', async () => {
    const prisma = {
      cart: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const config = {
      get: jest.fn((key: string, fallback: number) =>
        key === 'ABANDONED_CART_MIN_AGE_HOURS' ? 3 : fallback,
      ),
    };

    const result = await new CartService(
      prisma,
      config as never,
    ).listAbandonedCartEligibility();
    const where = (prisma.cart.findMany as jest.Mock).mock.calls[0][0].where;

    expect(where).toEqual(
      expect.objectContaining({
        status: 'ACTIVE',
        userId: { not: null },
        items: { some: {} },
        user: {
          is: expect.objectContaining({
            role: 'user',
            isDeleted: false,
            isEmailVerified: true,
          }),
        },
        checkoutDraft: {
          is: expect.objectContaining({
            marketingConsent: true,
            marketingConsentAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
            order: { is: null },
          }),
        },
      }),
    );
    expect(result.policy).toEqual({
      minimumAgeHours: 3,
      consentMaxAgeDays: 365,
    });
    expect(result.items).toEqual([]);
  });
});
