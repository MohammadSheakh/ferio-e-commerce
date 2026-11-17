import { TenantDatabasesService } from './tenant-databases.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TenantDatabasesService storage measurement', () => {
  let service: TenantDatabasesService;
  let mockPlatform: {
    client: {
      tenantDatabase: {
        findUnique: jest.Mock;
        update: jest.Mock;
      };
      $queryRawUnsafe: jest.Mock;
    };
  };
  let mockAudit: {
    record: jest.Mock;
  };

  beforeEach(() => {
    mockPlatform = {
      client: {
        tenantDatabase: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        $queryRawUnsafe: jest.fn(),
      },
    };
    mockAudit = {
      record: jest.fn().mockResolvedValue({}),
    };

    service = new TenantDatabasesService(
      mockPlatform as never,
      mockAudit as never,
    );
  });

  it('measures database storage on-demand and records audit evidence', async () => {
    mockPlatform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      organizationId: 'org-1',
      databaseName: 'ferio_tenant_demo_1234',
    });
    mockPlatform.client.$queryRawUnsafe.mockResolvedValue([
      { sizeBytes: '45088768', formattedSize: '43 MB' },
    ]);
    mockPlatform.client.tenantDatabase.update.mockResolvedValue({});

    const result = await service.measureStorage('org-1');

    expect(result).toMatchObject({
      tenantDatabaseId: 'tdb-1',
      databaseName: 'ferio_tenant_demo_1234',
      sizeBytes: '45088768',
      formattedSize: '43 MB',
    });
    expect(mockPlatform.client.tenantDatabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tdb-1' },
        data: expect.objectContaining({
          diskSizeBytes: BigInt('45088768'),
        }),
      }),
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TENANT_DATABASE_STORAGE_MEASURED',
        entityId: 'tdb-1',
      }),
    );
  });

  it('throws NotFoundException if the tenant database is not registered', async () => {
    mockPlatform.client.tenantDatabase.findUnique.mockResolvedValue(null);

    await expect(service.measureStorage('unknown-org')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException if the underlying database query fails', async () => {
    mockPlatform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      organizationId: 'org-1',
      databaseName: 'ferio_tenant_demo_1234',
    });
    mockPlatform.client.$queryRawUnsafe.mockRejectedValue(
      new Error('database does not exist'),
    );

    await expect(service.measureStorage('org-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('provisions signature storefront template for a specific organization', async () => {
    const mockTx = {
      storefrontPage: {
        findUnique: jest.fn().mockResolvedValue({ id: 'page-1', slug: 'home' }),
        update: jest.fn().mockResolvedValue({}),
      },
      storefrontPageVersion: {
        findFirst: jest.fn().mockResolvedValue({ versionNumber: 1 }),
        create: jest.fn().mockResolvedValue({
          id: 'ver-2',
          versionNumber: 2,
          sections: new Array(9).fill({ id: 'sec-1' }),
        }),
      },
    };

    const mockDb = {
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mockManager = {
      runTransient: jest.fn().mockImplementation((_mat, cb) => cb()),
      getClient: jest.fn().mockResolvedValue(mockDb),
    };

    const serviceWithManager = new TenantDatabasesService(
      mockPlatform as never,
      mockAudit as never,
      mockManager as never,
    );

    mockPlatform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      organizationId: 'org-1',
      status: 'READY',
      databaseName: 'ferio_tenant_demo_1234',
    });
    mockPlatform.client.subscription = {
      findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    } as never;
    mockPlatform.client.subscriptionEntitlementOverride = {
      upsert: jest.fn().mockResolvedValue({}),
    } as never;

    const result = await serviceWithManager.provisionSignatureStorefront('org-1');

    expect(result.status).toBe('PROVISIONED');
    expect(result.sectionsCount).toBe(9);
    expect(result.versionNumber).toBe(2);
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SIGNATURE_STOREFRONT_TEMPLATE_PROVISIONED',
        entityId: 'org-1',
      }),
    );
  });
});

