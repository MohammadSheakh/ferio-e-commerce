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
  it('rejects spoofed multipart content before calling the provider', async () => {
    const strategy = new R2Strategy();
    const send = jest.fn();
    Object.defineProperty(strategy, 's3Client', { value: { send } });

    await expect(
      runWithTenantContext(tenantContext, () =>
        strategy.uploadFile(
          {
            buffer: Buffer.from('not a png'),
            originalname: 'image.png',
            mimetype: 'image/png',
            size: 9,
          },
          'products',
        ),
      ),
    ).rejects.toThrow('Uploaded content does not match the declared file type');
    expect(send).not.toHaveBeenCalled();
  });

  it('verifies stored metadata and magic bytes after a direct upload', async () => {
    const strategy = new R2Strategy();
    const send = jest
      .fn()
      .mockResolvedValueOnce({ ContentType: 'image/png', ContentLength: 8 })
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: jest
            .fn()
            .mockResolvedValue(
              Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            ),
        },
      });
    Object.defineProperty(strategy, 's3Client', { value: { send } });

    await expect(
      runWithTenantContext(tenantContext, () =>
        strategy.inspectUploadedObject(
          'tenants/org-a/products/image.png',
          'image/png',
          8,
        ),
      ),
    ).resolves.toEqual({
      key: 'tenants/org-a/products/image.png',
      contentType: 'image/png',
      sizeBytes: 8,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects stored content whose signature does not match its declared type', async () => {
    const strategy = new R2Strategy();
    const send = jest
      .fn()
      .mockResolvedValueOnce({ ContentType: 'image/png', ContentLength: 3 })
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: jest
            .fn()
            .mockResolvedValue(Uint8Array.from([0xff, 0xd8, 0xff])),
        },
      });
    Object.defineProperty(strategy, 's3Client', { value: { send } });

    await expect(
      runWithTenantContext(tenantContext, () =>
        strategy.inspectUploadedObject(
          'tenants/org-a/products/image.png',
          'image/png',
          3,
        ),
      ),
    ).rejects.toThrow('STORAGE_OBJECT_CONTENT_MISMATCH');
  });

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
      runWithTenantContext(tenantContext, () =>
        strategy.listTenantObjectKeys(),
      ),
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
  });
});
