import { DomainsService } from './domains.service';

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

  beforeEach(() => {
    process.env.PLATFORM_PUBLIC_DOMAIN = 'ferio.test';
    platform = {
      client: {
        organization: { findUnique: jest.fn() },
        tenantDomain: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        $transaction: jest.fn((ops) => Promise.all(ops)),
      },
    };
    audit.record.mockClear();
    service = new DomainsService(platform as never, audit as never);
  });

  it('reserves an active primary subdomain from the org slug', async () => {
    platform.client.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    platform.client.tenantDomain.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'dom-1', ...data }),
    );

    const domain = await service.reserveSubdomain('org-1', 'acme-store');

    expect(domain.hostname).toBe('acme-store.ferio.test');
    expect(domain.status).toBe('ACTIVE');
    expect(domain.isPrimary).toBe(true);
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
  });
});
