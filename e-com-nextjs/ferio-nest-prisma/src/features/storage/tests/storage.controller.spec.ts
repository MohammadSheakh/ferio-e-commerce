import { runWithTenantContext } from '../../../tenancy/context/tenant-context';
import { StorageController } from '../storage.controller';

describe('StorageController tenant object access', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  it('rejects another tenant object namespace before signing a URL', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const getSignedUrl = jest.fn().mockResolvedValue('https://signed.example');
    const controller = new StorageController({ getSignedUrl } as never);
    const context = {
      correlationId: 'correlation-a',
      organizationId: 'org-a',
      tenantDatabaseId: 'database-a',
      database: {
        id: 'database-a',
        host: 'localhost',
        port: 5432,
        databaseName: 'tenant_a',
        username: 'tenant',
        credentialCipher: 'encrypted',
      },
      domainId: 'domain-a',
      hostname: 'a.ferio.test',
      subscriptionStatus: 'ACTIVE' as const,
    };

    await expect(
      runWithTenantContext(context, () =>
        controller.presignGet({ key: 'tenants/org-b/products/image.png' }),
      ),
    ).rejects.toThrow('STORAGE_KEY_FORBIDDEN');
    expect(getSignedUrl).not.toHaveBeenCalled();

    await expect(
      runWithTenantContext(context, () =>
        controller.presignGet({ key: 'tenants/org-a/products/image.png' }),
      ),
    ).resolves.toEqual({
      url: 'https://signed.example',
      key: 'tenants/org-a/products/image.png',
    });
  });

  it('passes the validated upload size into the presigned PUT contract', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const presignPut = jest.fn().mockResolvedValue({
      key: 'tenants/org-a/products/image.png',
      url: 'https://signed.example/put',
    });
    const controller = new StorageController({ presignPut } as never);

    await runWithTenantContext(
      {
        correlationId: 'correlation-a',
        organizationId: 'org-a',
        tenantDatabaseId: 'database-a',
        database: {
          id: 'database-a',
          host: 'localhost',
          port: 5432,
          databaseName: 'tenant_a',
          username: 'tenant',
          credentialCipher: 'encrypted',
        },
        domainId: 'domain-a',
        hostname: 'a.ferio.test',
        subscriptionStatus: 'ACTIVE' as const,
      },
      () =>
        controller.presignPut({
          folder: 'products',
          filename: 'image.png',
          contentType: 'image/png',
          sizeBytes: 1024,
        }),
    );

    expect(presignPut).toHaveBeenCalledWith(
      'products',
      'image.png',
      'image/png',
      1024,
    );
  });
});
