import type { PrismaClient } from '@prisma/client';
import {
  resolveTenantDatabase,
  TenantDbService,
} from '../services/tenant-db.service';
import { runWithTenantContext } from '../context/tenant-context';

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

    await expect(
      createService().getOrLegacy(legacyClient, 'test-legacy-mode'),
    ).resolves.toBe(
      legacyClient,
    );
  });

  it('fails closed when tenancy is enabled without a tenant context', async () => {
    process.env.TENANCY_ENABLED = 'true';

      await expect(
        createService().getOrLegacy(legacyClient, 'test-tenant-required'),
      ).rejects.toThrow(
      'TENANT_IDENTITY_CONTEXT_REQUIRED',
    );
  });

  it('uses the resolved tenant client when a tenant context exists', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const context = {
      correlationId: 'correlation-org-1',
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
      await expect(
        createService().getOrLegacy(legacyClient, 'test-tenant-context'),
      ).resolves.toBe(
        tenantClient,
      );
    });
  });

  it('keeps nested service lookups on the immutable tenant database boundary', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const clientA = {} as PrismaClient;
    const clientB = {} as PrismaClient;
    const manager = {
      getClient: jest.fn().mockImplementation((database: { id: string }) =>
        Promise.resolve(database.id === 'tdb-a' ? clientA : clientB),
      ),
    };
    const nestedServiceA = new TenantDbService(manager as never);
    const nestedServiceB = new TenantDbService(manager as never);
    const context = (organizationId: string, databaseId: string) => ({
      correlationId: `correlation-${organizationId}`,
      organizationId,
      tenantDatabaseId: databaseId,
      database: {
        id: databaseId,
        host: 'localhost',
        port: 5432,
        databaseName: `tenant_${organizationId}`,
        username: 'tenant',
        credentialCipher: 'encrypted',
      },
      domainId: `domain-${organizationId}`,
      hostname: `${organizationId}.example.com`,
      subscriptionStatus: 'ACTIVE' as const,
    });

    const [tenantA, tenantB] = await Promise.all([
      runWithTenantContext(context('a', 'tdb-a'), async () =>
        Promise.all([nestedServiceA.get(), nestedServiceB.get()]),
      ),
      runWithTenantContext(context('b', 'tdb-b'), async () =>
        Promise.all([nestedServiceA.get(), nestedServiceB.get()]),
      ),
    ]);

    expect(tenantA).toEqual([clientA, clientA]);
    expect(tenantB).toEqual([clientB, clientB]);
    expect(manager.getClient).toHaveBeenCalledTimes(4);
    expect(manager.getClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tdb-a' }),
    );
    expect(manager.getClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tdb-b' }),
    );
  });

  it('fails closed when the optional provider is missing in tenancy mode', async () => {
    process.env.TENANCY_ENABLED = 'true';

    await expect(
      resolveTenantDatabase(undefined, legacyClient, 'test-tenant-required'),
    ).rejects.toThrow('TENANT_DATABASE_SERVICE_REQUIRED');
  });

  it('allows the legacy client when the provider is missing in legacy mode', async () => {
    process.env.TENANCY_ENABLED = 'false';

    await expect(
      resolveTenantDatabase(undefined, legacyClient, 'test-legacy-mode'),
    ).resolves.toBe(
      legacyClient,
    );
  });
});
