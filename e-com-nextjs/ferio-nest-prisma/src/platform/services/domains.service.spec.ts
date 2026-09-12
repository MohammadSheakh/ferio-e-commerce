import { DomainsService } from './domains.service';
import { DomainReadinessService } from './domain-readiness.service';

describe('DomainsService lifecycle (MT-1)', () => {
  type PlatformMock = {
    client: {
      organization: { findUnique: jest.Mock };
      tenantDomain: Record<string, jest.Mock>;
      $transaction: jest.Mock;
    };
  };
  let service: DomainsService;
  let platform: PlatformMock;
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const entitlements = {
    evaluate: jest.fn().mockResolvedValue({ allowed: true }),
  };
  const readiness = { verify: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    process.env.PLATFORM_PUBLIC_DOMAIN = 'ferio.test';
    platform = {
      client: {
        organization: { findUnique: jest.fn() },
        tenantDomain: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        $transaction: jest.fn((ops) => Promise.all(ops)),
      },
    };
    audit.record.mockClear();
    entitlements.evaluate.mockClear();
    entitlements.evaluate.mockResolvedValue({ allowed: true });
    readiness.verify.mockClear();
    service = new DomainsService(
      platform as never,
      audit as never,
      entitlements as never,
      readiness as unknown as DomainReadinessService,
    );
  });

  it('reserves a pending primary subdomain from the org slug', async () => {
    platform.client.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    platform.client.tenantDomain.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'dom-1', ...data }),
    );

    const domain = await service.reserveSubdomain('org-1', 'acme-store');

    expect(domain.hostname).toBe('acme-store.ferio.test');
    expect(domain.status).toBe('PENDING_ACTIVATION');
    expect(domain.isPrimary).toBe(true);
  });

  it('activates a platform subdomain only through the readiness gate', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-1',
      hostname: 'acme-store.ferio.test',
      type: 'PLATFORM_SUBDOMAIN',
      status: 'PENDING_ACTIVATION',
    });
    platform.client.tenantDomain.update.mockResolvedValue({
      id: 'dom-1',
      hostname: 'acme-store.ferio.test',
      type: 'PLATFORM_SUBDOMAIN',
      status: 'ACTIVE',
    });

    await expect(
      service.activatePlatformSubdomain('dom-1'),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(platform.client.tenantDomain.update).toHaveBeenCalledWith({
      where: { id: 'dom-1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('rejects reserved subdomains before touching the database', async () => {
    await expect(service.reserveSubdomain('org-1', 'admin')).rejects.toThrow(
      'SUBDOMAIN_RESERVED_OR_INVALID',
    );
    expect(platform.client.tenantDomain.create).not.toHaveBeenCalled();
  });

  it('rejects invalid subdomain characters', async () => {
    await expect(
      service.reserveSubdomain('org-1', 'bad_underscore!'),
    ).rejects.toThrow('SUBDOMAIN_RESERVED_OR_INVALID');
  });

  it('custom domains start pending with a verification token and activate only on match', async () => {
    platform.client.tenantDomain.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'dom-2', ...data }),
    );
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-2',
      hostname: 'shop.example.com',
      status: 'PENDING_VERIFICATION',
      verificationToken: 'ferio-verify=token123',
    });
    platform.client.tenantDomain.update.mockResolvedValue({
      id: 'dom-2',
      status: 'ACTIVE',
    });

    const { verificationToken } = await service.addCustomDomain(
      'org-1',
      'WWW.ShopExample.COM',
    );
    expect(verificationToken).toContain('ferio-verify=');

    await expect(
      service.verifyOwnership('dom-2', 'wrong-token'),
    ).rejects.toThrow('DOMAIN_VERIFICATION_MISMATCH');

    const activated = await service.verifyOwnership(
      'dom-2',
      'ferio-verify=token123',
    );
    expect(activated.status).toBe('ACTIVE');
    expect(readiness.verify).toHaveBeenCalledWith(
      'shop.example.com',
      'ferio-verify=token123',
    );
    expect(entitlements.evaluate).toHaveBeenCalledWith(
      'org-1',
      'custom_domain',
    );
  });

  it('does not activate a custom domain until DNS and TLS are ready', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-3',
      hostname: 'shop.example.com',
      status: 'PENDING_VERIFICATION',
      verificationToken: 'ferio-verify=token123',
    });
    readiness.verify.mockRejectedValue(new Error('DOMAIN_TLS_NOT_READY'));

    await expect(
      service.verifyOwnership('dom-3', 'ferio-verify=token123'),
    ).rejects.toThrow('DOMAIN_TLS_NOT_READY');
    expect(platform.client.tenantDomain.update).not.toHaveBeenCalled();
  });

  it('denies custom-domain registration when the plan does not include it', async () => {
    entitlements.evaluate.mockResolvedValue({
      allowed: false,
      code: 'FEATURE_DISABLED',
    });

    await expect(
      service.addCustomDomain('org-1', 'shop.example.com'),
    ).rejects.toThrow('FEATURE_DISABLED');
    expect(platform.client.tenantDomain.create).not.toHaveBeenCalled();
  });

  it('fails closed when verification is requested through another organization', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-2',
      organizationId: 'org-a',
      status: 'PENDING_VERIFICATION',
      verificationToken: 'ferio-verify=token123',
    });

    await expect(
      service.verifyOwnership('dom-2', 'ferio-verify=token123', 'org-b'),
    ).rejects.toThrow('DOMAIN_NOT_FOUND');
    expect(platform.client.tenantDomain.update).not.toHaveBeenCalled();
  });

  it('fails closed when disabling a domain through another organization', async () => {
    platform.client.tenantDomain.findUnique.mockResolvedValue({
      id: 'dom-2',
      organizationId: 'org-a',
      hostname: 'shop.example.com',
      status: 'ACTIVE',
    });

    await expect(service.disable('dom-2', undefined, 'org-b')).rejects.toThrow(
      'DOMAIN_NOT_FOUND',
    );
    expect(platform.client.tenantDomain.update).not.toHaveBeenCalled();
  });

  it('returns credential-free health diagnostics for every domain', async () => {
    platform.client.tenantDomain.findMany.mockResolvedValue([
      {
        id: 'dom-1',
        hostname: 'acme.ferio.test',
        type: 'PLATFORM_SUBDOMAIN',
        status: 'ACTIVE',
        isPrimary: true,
        organization: { id: 'org-1', name: 'Acme', status: 'ACTIVE' },
      },
      {
        id: 'dom-2',
        hostname: 'shop.acme.test',
        type: 'CUSTOM',
        status: 'PENDING_VERIFICATION',
        isPrimary: false,
        organization: { id: 'org-1', name: 'Acme', status: 'ACTIVE' },
      },
      {
        id: 'dom-3',
        hostname: 'paused.ferio.test',
        type: 'PLATFORM_SUBDOMAIN',
        status: 'ACTIVE',
        isPrimary: true,
        organization: { id: 'org-2', name: 'Paused', status: 'SUSPENDED' },
      },
    ]);

    await expect(service.health()).resolves.toEqual({
      totalDomains: 3,
      healthyCount: 1,
      unhealthyCount: 2,
      byStatus: { ACTIVE: 2, PENDING_VERIFICATION: 1 },
      domains: [
        expect.objectContaining({
          id: 'dom-1',
          healthy: true,
          issue: null,
        }),
        expect.objectContaining({
          id: 'dom-2',
          healthy: false,
          issue: 'DOMAIN_PENDING_VERIFICATION',
        }),
        expect.objectContaining({
          id: 'dom-3',
          healthy: false,
          issue: 'ORGANIZATION_SUSPENDED',
        }),
      ],
    });
    expect(JSON.stringify(await service.health())).not.toContain(
      'verificationToken',
    );
  });

  it('invalidates every hostname for one organization and records bounded evidence', async () => {
    platform.client.tenantDomain.findMany.mockResolvedValue([
      { hostname: 'acme.ferio.test' },
      { hostname: 'shop.acme.test' },
    ]);

    await expect(
      service.invalidateOrganizationCache('org-1', 'platform-1'),
    ).resolves.toEqual({ organizationId: 'org-1', hostnameCount: 2 });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TENANT_DOMAIN_CACHE_INVALIDATED',
        entityId: 'org-1',
        actorId: 'platform-1',
        newValue: { hostnameCount: 2 },
      }),
    );
  });
});
