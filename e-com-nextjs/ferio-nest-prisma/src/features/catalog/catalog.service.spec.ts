import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CatalogService } from './catalog.service';
import { AuditService } from '../audit/audit.service';

const actor = { userId: 'admin-1', email: 'admin@ferio.test', role: 'admin' };
const audit = { record: jest.fn() } as unknown as AuditService;

describe('CatalogService', () => {
  it('creates a category with a normalized slug', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({
      id: 'category-1',
      ...data,
    }));
    const prisma = {
      category: { create },
      $transaction: jest.fn((callback) => callback({
        category: { create },
        auditLog: { create: jest.fn() },
      })),
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    const category = await service.createCategory({
      name: '  Home & Living  ',
    }, actor);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Home & Living',
        slug: 'home-living',
        isActive: true,
        sortOrder: 0,
      }),
    });
    expect(category.slug).toBe('home-living');
  });

  it('requires an explicit slug when a name cannot create a safe URL', async () => {
    const prisma = {
      category: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback({
        category: { create: jest.fn() },
      })),
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.createCategory({ name: 'শাড়ি' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid compare-at price before writing a product', async () => {
    const prisma = {
      category: { findFirst: jest.fn() },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.createProduct(
        {
          name: 'Test product',
          description: 'Product description',
          categoryId: 'category-1',
          variants: [
            {
              name: 'Default',
              sku: 'TEST-1',
              price: 10000,
              compareAtPrice: 9000,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents adjustments that would make available stock negative', async () => {
    const transaction = {
      inventoryStock: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stock-1',
          onHand: 10,
          reserved: 4,
          damaged: 1,
        }),
      },
      inventoryMovement: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.adjustInventory(
        'variant-1',
        {
          quantityDelta: -6,
          adjustmentReason: 'STOCK_COUNT_CORRECTION',
          reason: 'Damaged count correction',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('requires a grade and disclosure for second-hand products', async () => {
    const prisma = {
      category: { findFirst: jest.fn() },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.createProduct(
        {
          name: 'Used phone',
          description: 'A previously owned phone',
          categoryId: 'category-1',
          condition: 'SECOND_HAND',
          variants: [{ name: 'Default', sku: 'USED-1', price: 10000 }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects negative purchase receipts', async () => {
    const prisma = {} as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.adjustInventory(
        'variant-1',
        {
          quantityDelta: -1,
          adjustmentReason: 'PURCHASE_RECEIPT',
          referenceId: 'PO-100',
          reason: 'Supplier delivery correction',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents deactivating a category with published products', async () => {
    const prisma = {
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-1',
          name: 'Apparel',
        }),
      },
      product: { count: jest.fn().mockResolvedValue(2) },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.updateCategory('category-1', { isActive: false }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents deleting a category that still owns products', async () => {
    const prisma = {
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-1',
          name: 'Apparel',
          _count: { products: 1, children: 0 },
        }),
      },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.deleteCategory('category-1', actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes an empty category inside an audited transaction', async () => {
    const category = {
      id: 'category-1',
      name: 'Empty category',
      _count: { products: 0, children: 0 },
    };
    const deleteCategory = jest.fn().mockResolvedValue(category);
    const transaction = {
      category: { delete: deleteCategory },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      category: { findUnique: jest.fn().mockResolvedValue(category) },
      $transaction: jest.fn((callback) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(service.deleteCategory('category-1', actor)).resolves.toEqual({
      id: 'category-1',
      deleted: true,
    });
    expect(deleteCategory).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    });
  });

  it('prevents publishing without an active category and variant', async () => {
    const update = jest.fn();
    const prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'product-1',
          category: { isActive: false },
          variants: [],
        }),
        update,
      },
    } as unknown as PrismaService;
    const service = new CatalogService(prisma, audit);

    await expect(
      service.updateProductStatus('product-1', { status: 'ACTIVE' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });
});
