import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { CatalogService } from './catalog.service';
import { CommerceSettingsService } from '../settings/services/commerce-settings.service';

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


describe('CommerceSettingsService tenant routing (MT-7 slice 2 - branding)', () => {
  const legacyPrisma = {
    commerceSettings: {
      upsert: jest.fn().mockResolvedValue({ id: 'default', storeName: 'Legacy Store' }),
    },
  };
  const tenantClient = {
    commerceSettings: {
      upsert: jest.fn().mockResolvedValue({ id: 'default', storeName: 'Tenant A Store' }),
    },
  };
  const audit = { record: jest.fn() };
  const config = {} as never;

  beforeEach(() => jest.clearAllMocks());

  it('serves store branding from the resolved TENANT database inside a storefront request', async () => {
    const service = new CommerceSettingsService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
      config,
      { tryGet: jest.fn().mockResolvedValue(tenantClient) } as unknown as TenantDbService,
    );

    const result = await service.get();

    expect(result.storeName).toBe('Tenant A Store');
    expect(tenantClient.commerceSettings.upsert).toHaveBeenCalledTimes(1);
    expect(legacyPrisma.commerceSettings.upsert).not.toHaveBeenCalled();
  });

  it('keeps legacy branding behavior outside tenant requests', async () => {
    const service = new CommerceSettingsService(
      legacyPrisma as unknown as PrismaService,
      audit as never,
      config,
      { tryGet: jest.fn().mockResolvedValue(undefined) } as unknown as TenantDbService,
    );

    const result = await service.get();

    expect(result.storeName).toBe('Legacy Store');
    expect(legacyPrisma.commerceSettings.upsert).toHaveBeenCalledTimes(1);
  });
});
