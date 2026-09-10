import { sanitizeStoragePath } from './r2.strategy';
import { R2Strategy } from './r2.strategy';
import { runWithTenantContext } from '../../../tenancy/context/tenant-context';

const tenantContext = {
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

describe('sanitizeStoragePath', () => {
  it('keeps safe nested folder segments', () => {
    expect(sanitizeStoragePath('products/images')).toBe('products/images');
  });

  it('removes traversal-like and unsafe folder input', () => {
    expect(sanitizeStoragePath('../products/../../images')).toBe(
      'products/images',
    );
  });

  it('uses a safe fallback for empty input', () => {
    expect(sanitizeStoragePath('////', 'uploads')).toBe('uploads');
  });
});

describe('R2 tenant lifecycle operations', () => {
  it('lists only the ambient tenant prefix across pages', async () => {
    const strategy = new R2Strategy();
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        Contents: [{ Key: 'tenants/org-a/products/a.png' }],
        IsTruncated: true,
        NextContinuationToken: 'next',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'tenants/org-a/products/b.png' }],
        IsTruncated: false,
      });
    Object.defineProperty(strategy, 's3Client', { value: { send } });

    await expect(
      runWithTenantContext(tenantContext, () => strategy.listTenantObjectKeys()),
    ).resolves.toEqual([
      'tenants/org-a/products/a.png',
      'tenants/org-a/products/b.png',
    ]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('refuses bulk lifecycle operations without tenant context', async () => {
    const strategy = new R2Strategy();

    await expect(strategy.listTenantObjectKeys()).rejects.toThrow(
      'TENANT_IDENTITY_CONTEXT_REQUIRED_FOR_OBJECT_STORAGE',
    );
  });

  it('deletes only keys returned from the ambient tenant prefix', async () => {
    const strategy = new R2Strategy();
    const send = jest
      .fn()
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'tenants/org-a/products/a.png' },
          { Key: 'tenants/org-a/evidence/b.pdf' },
        ],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({});
    Object.defineProperty(strategy, 's3Client', { value: { send } });

    await expect(
      runWithTenantContext(tenantContext, () => strategy.deleteTenantObjects()),
    ).resolves.toEqual({ deleted: 2 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].input.Delete.Objects).toEqual([
      { Key: 'tenants/org-a/products/a.png' },
      { Key: 'tenants/org-a/evidence/b.pdf' },
    ]);
  });
});
