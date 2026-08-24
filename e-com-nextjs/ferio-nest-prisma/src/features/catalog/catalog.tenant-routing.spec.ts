import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { CatalogService } from './catalog.service';

describe('CatalogService tenant routing (MT-7 slice 1)', () => {
  const legacyPrisma = {
    category: { findMany: jest.fn().mockResolvedValue([{ id: 'legacy-cat' }]) },
    brand: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn() },
  };
  const audit = { record: jest.fn() };

  const tenantClient = {
    category: { findMany: jest.fn().mockResolvedValue([{ id: 'tenant-a-cat' }]) },
    brand: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn() },
  };

  const tenantDbFor = (client: Record<string, unknown> | undefined) =>
    ({ tryGet: jest.fn().mockResolvedValue(client) }) as unknown as TenantDbService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes storefront reads to the resolved TENANT database inside a tenant request', async () => {
    const service = new CatalogService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
      tenantDbFor(tenantClient),
    );

    const categories = await service.getCategories(true);

    // Tenant A sees its own catalog row, never the legacy database's.
    expect(categories).toEqual([{ id: 'tenant-a-cat' }]);
    expect(tenantClient.category.findMany).toHaveBeenCalledTimes(1);
    expect(legacyPrisma.category.findMany).not.toHaveBeenCalled();
  });

  it('keeps legacy-database behavior outside tenant requests (LEGACY mode / admin plane)', async () => {
    const service = new CatalogService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
      tenantDbFor(undefined),
    );

    await service.getCategories(false);

    expect(legacyPrisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(tenantClient.category.findMany).not.toHaveBeenCalled();
  });

  it('works without TenantDbService injected at all (existing deployments/tests)', async () => {
    const service = new CatalogService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
    );

    await service.getCategories(true);

    expect(legacyPrisma.category.findMany).toHaveBeenCalledTimes(1);
  });

  it('routes public product detail to the tenant client and preserves publish filters', async () => {
    const service = new CatalogService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
      tenantDbFor(tenantClient),
    );

    await service.getPublicProductBySlug('some-slug').catch(() => undefined);

    expect(tenantClient.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'some-slug',
          status: 'ACTIVE',
          publishedAt: expect.objectContaining({ lte: expect.any(Date) }),
          variants: { some: { isActive: true } },
        }),
      }),
    );
    expect(legacyPrisma.product.findFirst).not.toHaveBeenCalled();
  });
});
