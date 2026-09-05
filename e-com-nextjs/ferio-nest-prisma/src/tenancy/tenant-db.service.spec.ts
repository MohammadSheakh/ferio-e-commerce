import type { PrismaClient } from '@prisma/client';
import { TenantDbService } from './tenant-db.service';
import { runWithTenantContext } from './tenant-context';

describe('TenantDbService database selection', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;
  const legacyClient = {} as PrismaClient;
  const tenantClient = {} as PrismaClient;

  afterEach(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  function createService(): TenantDbService {
    return new TenantDbService({
      getClient: jest.fn().mockResolvedValue(tenantClient),
    } as never);
  }

  it('uses the explicit legacy client when tenancy is disabled', async () => {
    process.env.TENANCY_ENABLED = 'false';

    await expect(createService().getOrLegacy(legacyClient)).resolves.toBe(
      legacyClient,
    );
  });

  it('fails closed when tenancy is enabled without a tenant context', async () => {
    process.env.TENANCY_ENABLED = 'true';

    await expect(createService().getOrLegacy(legacyClient)).rejects.toThrow(
      'TENANT_IDENTITY_CONTEXT_REQUIRED',
    );
  });

  it('uses the resolved tenant client when a tenant context exists', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const context = {
      organizationId: 'org-1',
      tenantDatabaseId: 'tdb-1',
      database: {
        id: 'tdb-1',
        host: 'localhost',
        port: 5432,
        databaseName: 'tenant_org_1',
        username: 'tenant',
        credentialCipher: 'encrypted',
      },
      domainId: 'domain-1',
      hostname: 'store.example.com',
      subscriptionStatus: 'ACTIVE' as const,
    };

    await runWithTenantContext(context, async () => {
      await expect(createService().getOrLegacy(legacyClient)).resolves.toBe(
        tenantClient,
      );
    });
  });
});
