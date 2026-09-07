import { ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

type OrganizationsPlatform = {
  client: {
    organization: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    organizationMember: { create: jest.Mock };
    organizationLifecycleEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
};

type TransactionOperation =
  | ((client: OrganizationsPlatform['client']) => Promise<unknown>)
  | readonly Promise<unknown>[];

function firstCallInput<T>(mock: jest.Mock): T {
  const call = mock.mock.calls[0] as unknown as [T] | undefined;
  if (!call) throw new Error('Expected mock call');
  return call[0];
}

describe('OrganizationsService lifecycle state machine', () => {
  let service: OrganizationsService;
  let platform: OrganizationsPlatform;
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
        $transaction: jest.fn((operation: TransactionOperation) =>
          typeof operation === 'function'
            ? operation(platform.client)
            : Promise.all(operation),
        ),
      },
    };
    audit = { record: jest.fn().mockResolvedValue({}) };
    service = new OrganizationsService(platform as never, audit as never);
  });

  it('creates an organization with an owner membership and audit record', async () => {
    platform.client.organization.create.mockResolvedValueOnce(
      org('PROVISIONING'),
    );

    await service.create({
      name: 'Acme',
      slug: 'Acme-Store',
      ownerEmail: 'Owner@Example.com ',
    });

    expect(
      firstCallInput<{ data: { slug: string } }>(
        platform.client.organization.create,
      ),
    ).toMatchObject({ data: { slug: 'acme-store' } });
    expect(
      firstCallInput<{ data: { email: string; role: string } }>(
        platform.client.organizationMember.create,
      ),
    ).toMatchObject({
      data: { email: 'owner@example.com', role: 'OWNER' },
    });
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects duplicate slugs with a stable code', async () => {
    const conflict = Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['slug'] },
    });
    platform.client.organization.create.mockRejectedValueOnce(conflict);

    await expect(
      service.create({ name: 'Acme', slug: 'acme', ownerEmail: 'o@e.com' }),
    ).rejects.toThrow('ORGANIZATION_SLUG_TAKEN');
  });

  it('maps an owner membership uniqueness conflict separately', async () => {
    platform.client.organization.create.mockResolvedValueOnce(
      org('PROVISIONING'),
    );
    platform.client.organizationMember.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), {
        code: 'P2002',
        meta: { target: ['organizationId_email'] },
      }),
    );

    await expect(
      service.create({ name: 'Acme', slug: 'acme', ownerEmail: 'o@e.com' }),
    ).rejects.toThrow('ORGANIZATION_OWNER_CONFLICT');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([
    ['ORGANIZATION_NAME_INVALID', { name: ' ' }],
    ['ORGANIZATION_OWNER_EMAIL_INVALID', { ownerEmail: 'invalid-email' }],
  ])('rejects invalid service input with %s', async (code, overrides) => {
    await expect(
      service.create({
        name: 'Acme',
        slug: 'acme',
        ownerEmail: 'owner@example.com',
        ...overrides,
      }),
    ).rejects.toThrow(new ConflictException(code));
    expect(platform.client.$transaction).not.toHaveBeenCalled();
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

    const attempt = service.transition('org-1', to as never, {
      reason: 'test',
    });
    if (allowed) {
      await expect(attempt).resolves.toBeDefined();
      expect(
        firstCallInput<{ data: { fromStatus: string; toStatus: string } }>(
          platform.client.organizationLifecycleEvent.create,
        ),
      ).toMatchObject({ data: { fromStatus: from, toStatus: to } });
    } else {
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    }
  });
});
