import {
  normalizeTenantHost,
  TenantResolutionException,
} from './tenant-errors';
import { TenantResolverService } from './tenant-resolver.service';

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
  const originalEnv = { ...process.env };
  let service: any;
  let platform: { client: any };
  const redis = { getClient: jest.fn().mockResolvedValue(null) };

  beforeEach(() => {
    platform = { client: { tenantDomain: { findUnique: jest.fn() }, tenantDatabase: { findUnique: jest.fn() } } };
    // Constructed manually to avoid Nest DI in tests.
    service = new TenantResolverService(platform as never, redis as never);
    jest.spyOn(service, 'writeCache').mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses Host when no forwarding header is supplied', () => {
    expect(
      service.effectiveHostFrom({
        headers: {},
        hostname: 'store.example.com',
        remoteAddress: '203.0.113.10',
      }),
    ).toBe('store.example.com');
  });

  it('accepts one forwarded host from a configured proxy CIDR', () => {
    process.env.NODE_ENV = 'production';
    process.env.TENANT_TRUSTED_PROXY_CIDRS = '172.16.0.0/12,10.20.30.40/32';

    expect(
      service.effectiveHostFrom({
        headers: { 'x-forwarded-host': 'store.example.com' },
        hostname: 'backend.internal',
        remoteAddress: '::ffff:172.22.0.8',
      }),
    ).toBe('store.example.com');
  });

  it('rejects a forwarded host from an untrusted direct client', () => {
    process.env.NODE_ENV = 'production';
    process.env.TENANT_TRUSTED_PROXY_CIDRS = '172.16.0.0/12';

    expect(() =>
      service.effectiveHostFrom({
        headers: { 'x-forwarded-host': 'victim.example.com' },
        hostname: 'attacker.example.com',
        remoteAddress: '203.0.113.10',
      }),
    ).toThrow(
      expect.objectContaining({ code: 'TENANT_FORWARDED_HOST_UNTRUSTED' }),
    );
  });

  it('fails closed on ambiguous forwarded-host chains', () => {
    process.env.TENANT_TRUSTED_PROXY_CIDRS = '127.0.0.1/32';

    expect(() =>
      service.effectiveHostFrom({
        headers: {
          'x-forwarded-host': 'attacker.example.com, store.example.com',
        },
        hostname: 'backend.internal',
        remoteAddress: '127.0.0.1',
      }),
    ).toThrow(expect.objectContaining({ code: 'TENANT_HOST_INVALID' }));
    expect(() =>
      service.effectiveHostFrom({
        headers: {
          'x-forwarded-host': ['attacker.example.com', 'store.example.com'],
        },
        hostname: 'backend.internal',
        remoteAddress: '127.0.0.1',
      }),
    ).toThrow(expect.objectContaining({ code: 'TENANT_HOST_INVALID' }));
  });

  it('trusts no forwarded proxy by default in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TENANT_TRUSTED_PROXY_CIDRS;

    expect(() =>
      service.effectiveHostFrom({
        headers: { 'x-forwarded-host': 'store.example.com' },
        hostname: 'backend.internal',
        remoteAddress: '127.0.0.1',
      }),
    ).toThrow(
      expect.objectContaining({ code: 'TENANT_FORWARDED_HOST_UNTRUSTED' }),
    );
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

  it('resolves SUSPENDED organizations as browsable per PO-005 (checkout disabled downstream)', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      status: 'ACTIVE',
      organization: { id: 'org-1', status: 'SUSPENDED', subscription: { status: 'SUSPENDED' } },
    });
    platform.client.tenantDatabase.findUnique.mockResolvedValue({
      id: 'tdb-1',
      status: 'READY',
      host: 'h', port: 5432, databaseName: 'd', username: 'u', credentialCipher: 'c',
    });

    await expect(
      service.resolveFromHost('suspended.example.com'),
    ).resolves.toMatchObject({
      organizationId: 'org-1',
      subscriptionStatus: 'SUSPENDED',
    });
  });

  it('still takes closure-pending and closed stores fully offline', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      status: 'ACTIVE',
      organization: { id: 'org-9', status: 'CLOSURE_PENDING', subscription: null },
    });
    await expect(
      service.resolveFromHost('closing.example.com'),
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

  it('does not trust malformed or cross-host positive cache entries', async () => {
    const cached = {
      get: jest.fn().mockResolvedValue(
        JSON.stringify({
          organizationId: 'org-attacker',
          tenantDatabaseId: 'tdb-attacker',
          database: {
            id: 'tdb-attacker',
            host: 'db',
            port: 5432,
            databaseName: 'tenant',
            username: 'tenant',
            credentialCipher: 'cipher',
          },
          domainId: 'dom-attacker',
          hostname: 'other.example.com',
          subscriptionStatus: 'ACTIVE',
        }),
      ),
    };
    const redisBackedService = new TenantResolverService(
      platform as never,
      { getClient: jest.fn().mockResolvedValue(cached) } as never,
    );

    await expect(
      redisBackedService.resolveFromHost('acme.example.com'),
    ).rejects.toMatchObject({ code: 'TENANT_RESOLUTION_FAILED' });
    expect(platform.client.tenantDomain.findUnique).toHaveBeenCalled();
  });
});
