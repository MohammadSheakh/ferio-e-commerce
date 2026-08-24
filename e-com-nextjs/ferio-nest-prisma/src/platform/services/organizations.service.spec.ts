import { ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService lifecycle state machine', () => {
  let service: OrganizationsService;
  let platform: { client: any };
  let audit: { record: jest.Mock };

  const org = (status: string) => ({
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    status,
  });

  beforeEach(() => {
    platform = {
      client: {
        organization: {
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn().mockResolvedValue(org('ACTIVE')),
        },
        organizationMember: { create: jest.fn() },
        organizationLifecycleEvent: { create: jest.fn() },
        $transaction: jest.fn((ops) => Promise.all(ops)),
      },
    };
    audit = { record: jest.fn().mockResolvedValue({}) };
    service = new OrganizationsService(platform as never, audit as never);
  });

  it('creates an organization with an owner membership and audit record', async () => {
    platform.client.organization.create.mockResolvedValueOnce(org('PROVISIONING'));

    await service.create({ name: 'Acme', slug: 'Acme-Store', ownerEmail: 'Owner@Example.com ' });

    expect(platform.client.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'acme-store' }) }),
    );
    expect(platform.client.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'owner@example.com', role: 'OWNER' }),
      }),
    );
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects duplicate slugs with a stable code', async () => {
    const conflict: any = new Error('unique');
    conflict.code = 'P2002';
    platform.client.organization.create.mockRejectedValueOnce(conflict);

    await expect(service.create({ name: 'A', slug: 'acme', ownerEmail: 'o@e.com' })).rejects.toThrow(
      'ORGANIZATION_SLUG_TAKEN',
    );
  });

  it.each([
    ['PROVISIONING', 'ACTIVE', true],
    ['PROVISIONING', 'SUSPENDED', false],
    ['ACTIVE', 'SUSPENDED', true],
    ['SUSPENDED', 'ACTIVE', true],
    ['ACTIVE', 'CLOSURE_PENDING', true],
    ['CLOSED', 'ACTIVE', false],
    ['ARCHIVED', 'ANYTHING', false],
  ])('%s -> %s is %s', async (from, to, allowed) => {
    platform.client.organization.findUnique.mockResolvedValueOnce(org(from));

    const attempt = service.transition('org-1', to as never, { reason: 'test' });
    if (allowed) {
      await expect(attempt).resolves.toBeDefined();
      expect(platform.client.organizationLifecycleEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fromStatus: from, toStatus: to }),
        }),
      );
    } else {
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    }
  });
});
