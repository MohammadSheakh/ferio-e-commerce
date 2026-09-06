import { ServiceUnavailableException } from '@nestjs/common';
import { runWithTenantContext } from '../context/tenant-context';
import {
  assertTenantObjectKey,
  tenantObjectKey,
} from '../utils/object-keys.util';

describe('tenantObjectKey', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  it('keeps the legacy namespace only when tenancy is disabled', () => {
    process.env.TENANCY_ENABLED = 'false';

    expect(tenantObjectKey('products', 'image.png')).toBe(
      'legacy/products/image.png',
    );
  });

  it('fails closed when tenant mode has no resolved context', () => {
    process.env.TENANCY_ENABLED = 'true';

    expect(() => tenantObjectKey('products', 'image.png')).toThrow(
      ServiceUnavailableException,
    );
    expect(() => tenantObjectKey('products', 'image.png')).toThrow(
      'TENANT_IDENTITY_CONTEXT_REQUIRED_FOR_OBJECT_STORAGE',
    );
  });

  it('namespaces keys with the immutable resolved organization', () => {
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

    expect(
      runWithTenantContext(context, () =>
        tenantObjectKey('products', 'image.png'),
      ),
    ).toBe('tenants/org-1/products/image.png');
  });

  it('rejects another organization key in the current tenant context', () => {
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

    expect(() =>
      runWithTenantContext(context, () =>
        assertTenantObjectKey('tenants/org-2/products/image.png'),
      ),
    ).toThrow('STORAGE_KEY_FORBIDDEN');
  });
});
