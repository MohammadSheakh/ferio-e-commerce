import {
  normalizeTenantHost,
  TenantResolutionException,
} from './tenant-errors';

describe('normalizeTenantHost (ADR-0002 security boundary)', () => {
  it('canonicalizes ordinary hosts', () => {
    expect(normalizeTenantHost('Acme.Ferio.Local:6733')).toBe('acme.ferio.local');
    expect(normalizeTenantHost('shop.example.com.')).toBe('shop.example.com');
  });

  it.each([
    [undefined],
    [''],
    ['not a host'],
    ['-leadingdash.example.com'],
    ['trailing-.example.com'],
    ['192.168.1.10'], // IP literals can never select a tenant
    ['[::1]:6733'],
    ['double..dot.com'],
    ['a'.repeat(300) + '.com'],
    ['under_score.example.com'],
  ])('rejects %j with TENANT_HOST_INVALID', (input) => {
    expect(() => normalizeTenantHost(input as string)).toThrow(TenantResolutionException);
  });
});

describe('TenantResolverService fail-closed resolution (MT-2 gate)', () => {
  let service: any;
  let platform: { client: any };
  const redis = { getClient: jest.fn().mockResolvedValue(null) };

  beforeEach(() => {
    platform = { client: { tenantDomain: { findUnique: jest.fn() }, tenantDatabase: { findUnique: jest.fn() } } };
    // Constructed manually to avoid Nest DI in tests.
    const { TenantResolverService } = require('./tenant-resolver.service');
    service = new TenantResolverService(platform as never, redis as never);
    jest.spyOn(service, 'writeCache').mockResolvedValue(undefined);
  });

  it('fails closed when the hostname is unknown — never falls back to legacy DB', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue(null);

    await expect(
      service.resolveFromHost('unknown.ferio.local'),
    ).rejects.toMatchObject({ code: 'TENANT_RESOLUTION_FAILED' });
    expect(platform.client.tenantDatabase.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed on inactive domains without probing the database registry', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      status: 'PENDING_VERIFICATION',
      organization: {},
    });

    await expect(
      service.resolveFromHost('pending.example.com'),
    ).rejects.toMatchObject({ code: 'TENANT_RESOLUTION_FAILED' });
    expect(platform.client.tenantDatabase.findUnique).not.toHaveBeenCalled();
  });

  it('reports suspended organizations as TENANT_SUSPENDED, not not-found', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      status: 'ACTIVE',
      organization: { status: 'SUSPENDED', subscription: { status: 'ACTIVE' } },
    });

    await expect(
      service.resolveFromHost('suspended.example.com'),
    ).rejects.toMatchObject({ code: 'TENANT_SUSPENDED' });
  });

  it('resolves a healthy tenant with its registry ID and subscription state', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      hostname: 'acme.example.com',
      status: 'ACTIVE',
      organization: {
        id: 'org-1',
        status: 'ACTIVE',
        subscription: { status: 'ACTIVE' },
      },
    });
    platform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      status: 'READY',
      host: 'localhost',
      port: 5432,
      databaseName: 'ferio_tenant_acme',
      username: 'tenant_user',
      credentialCipher: 'envelope-blob', // ciphertext only; never plaintext
    });

    await expect(service.resolveFromHost('acme.example.com:8080')).resolves.toEqual({
      organizationId: 'org-1',
      tenantDatabaseId: 'tdb-1',
      database: {
        id: 'tdb-1',
        host: 'localhost',
        port: 5432,
        databaseName: 'ferio_tenant_acme',
        username: 'tenant_user',
        credentialCipher: 'envelope-blob',
      },
      domainId: 'dom-1',
      hostname: 'acme.example.com',
      subscriptionStatus: 'ACTIVE',
    });
  });

  it('blocks tenants whose schema is behind the supported version', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      status: 'ACTIVE',
      organization: { id: 'org-1', status: 'ACTIVE', subscription: null },
    });
    platform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      status: 'MIGRATION_REQUIRED',
    });

    await expect(
      service.resolveFromHost('behind.example.com'),
    ).rejects.toMatchObject({ code: 'TENANT_MIGRATION_REQUIRED' });
  });
});
