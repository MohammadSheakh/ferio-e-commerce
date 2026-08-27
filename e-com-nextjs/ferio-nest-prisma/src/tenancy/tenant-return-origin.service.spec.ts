import { TenantReturnOriginService } from './tenant-return-origin.service';

describe('TenantReturnOriginService', () => {
  const tenantDomain = { findFirst: jest.fn() };
  const service = new TenantReturnOriginService({
    client: { tenantDomain },
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('selects an active primary domain and returns an HTTPS origin', async () => {
    tenantDomain.findFirst.mockResolvedValue({ hostname: 'shop.example.com' });

    await expect(service.forOrganization('org-a')).resolves.toBe(
      'https://shop.example.com',
    );
    expect(tenantDomain.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'org-a', status: 'ACTIVE' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { hostname: true },
    });
  });

  it('fails closed when the organization has no active return domain', async () => {
    tenantDomain.findFirst.mockResolvedValue(null);

    await expect(service.forOrganization('org-a')).rejects.toThrow(
      'TENANT_RETURN_DOMAIN_UNAVAILABLE',
    );
  });

  it('rejects malformed control-plane host data', async () => {
    tenantDomain.findFirst.mockResolvedValue({
      hostname: 'shop.example.com:8443',
    });

    await expect(service.forOrganization('org-a')).rejects.toThrow(
      'TENANT_RETURN_DOMAIN_INVALID',
    );
  });
});
