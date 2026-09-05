import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import {
  TenantMembershipGuard,
  TenantMembershipService,
} from './tenant-membership.guard';
import { runWithTenantContext } from './tenant-context';

type MemberRowStub = {
  id: string;
  organizationId: string;
  email: string;
  isActive: boolean;
  role: 'OWNER' | 'STAFF';
};

type MembershipPlatformDouble = {
  organizationMember: { findFirst: jest.Mock };
};

type GuardRequest = {
  user?: { email?: string };
  tenantMembership?: { membershipId: string; role: 'OWNER' | 'STAFF' };
};

function firstCallInput<T>(mock: jest.Mock): T {
  const call = mock.mock.calls[0] as unknown as [T] | undefined;
  if (!call) throw new Error('Expected mock call');
  return call[0];
}

describe('TenantMembershipGuard (MT-2 §5.3 / ADR-0004)', () => {
  const originalFlag = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalFlag;
  });

  function build(roster: MemberRowStub[]) {
    const platformClient: MembershipPlatformDouble = {
      organizationMember: {
        findFirst: jest
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where: { email: string; organizationId: string };
            }) => {
              return (
                roster.find(
                  (m) =>
                    m.email === where.email &&
                    m.isActive &&
                    m.organizationId === where.organizationId,
                ) ?? null
              );
            },
          ),
      },
    };
    const service = new TenantMembershipService(platformClient as never);
    const guard = new TenantMembershipGuard(service);
    return {
      service,
      guard,
      findFirst: platformClient.organizationMember.findFirst,
    };
  }

  const contextFor = (user?: { email: string }): ExecutionContext =>
    ({
      switchToHttp: (): { getRequest: () => GuardRequest } => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('passes through in LEGACY mode without any roster lookup', async () => {
    process.env.TENANCY_ENABLED = 'false';
    const { guard, findFirst } = build([
      {
        id: 'm-1',
        organizationId: 'org-A',
        email: 'owner@acme.com',
        isActive: true,
        role: 'OWNER',
      },
    ]);

    await expect(
      runWithTenantContext(
        {
          organizationId: 'org-A',
          tenantDatabaseId: 'tdb-1',
          database: {} as never,
          domainId: 'dom-1',
          hostname: 'acme.example.com',
          subscriptionStatus: 'ACTIVE',
        },
        () => guard.canActivate(contextFor(undefined)),
      ),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('accepts an authenticated member of the resolved organization', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { guard } = build([
      {
        id: 'm-1',
        organizationId: 'org-A',
        email: 'owner@acme.com',
        isActive: true,
        role: 'OWNER',
      },
    ]);

    const request: GuardRequest = { user: { email: 'Owner@Acme.com' } };
    await expect(
      runWithTenantContext(
        {
          organizationId: 'org-A',
          tenantDatabaseId: 'tdb-1',
          database: {} as never,
          domainId: 'dom-1',
          hostname: 'acme.example.com',
          subscriptionStatus: 'ACTIVE',
        },
        () =>
          guard.canActivate({
            switchToHttp: () => ({ getRequest: () => request }),
          } as unknown as ExecutionContext),
      ),
    ).resolves.toBe(true);
    expect(request.tenantMembership).toMatchObject({ role: 'OWNER' });
  });

  it('rejects a valid session that belongs to a DIFFERENT organization (cross-tenant replay)', async () => {
    process.env.TENANCY_ENABLED = 'true';
    // Roster for org-B only; request resolves org-A.
    const { guard, findFirst } = build([
      {
        id: 'm-2',
        organizationId: 'org-B',
        email: 'owner@other.com',
        isActive: true,
        role: 'OWNER',
      },
    ]);

    await expect(
      runWithTenantContext(
        {
          organizationId: 'org-A',
          tenantDatabaseId: 'tdb-1',
          database: {} as never,
          domainId: 'dom-1',
          hostname: 'a.example.com',
          subscriptionStatus: 'ACTIVE',
        },
        () =>
          guard.canActivate({
            switchToHttp: () =>
              ({
                getRequest: () => ({ user: { email: 'owner@other.com' } }),
              }) as never,
          } as never),
      ),
    ).rejects.toMatchObject({ message: 'TENANT_MEMBERSHIP_REQUIRED' });
    expect(
      firstCallInput<{ where: { organizationId: string } }>(findFirst),
    ).toMatchObject({ where: { organizationId: 'org-A' } });
  });

  it('rejects unauthenticated requests when tenancy is on', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { guard } = build([]);

    await expect(
      runWithTenantContext(
        {
          organizationId: 'org-A',
          tenantDatabaseId: 'tdb-1',
          database: {} as never,
          domainId: 'dom-1',
          hostname: 'a.example.com',
          subscriptionStatus: 'ACTIVE',
        },
        () =>
          guard.canActivate({
            switchToHttp: () => ({ getRequest: () => ({}) }) as never,
          } as never),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TenantMembershipService roster caching', () => {
  it('caches lookups per org+email and invalidates on roster change', async () => {
    const row = {
      id: 'm-1',
      email: 'staff@acme.com',
      isActive: true,
      role: 'STAFF' as const,
    };
    const platformClient: MembershipPlatformDouble = {
      organizationMember: { findFirst: jest.fn().mockResolvedValue(row) },
    };
    const service = new TenantMembershipService(platformClient as never);

    await service.findActive('org-A', 'staff@acme.com');
    await service.findActive('org-A', 'staff@acme.com');
    expect(platformClient.organizationMember.findFirst).toHaveBeenCalledTimes(
      1,
    );

    service.invalidate('org-A', 'staff@acme.com');
    await service.findActive('org-A', 'staff@acme.com');
    expect(platformClient.organizationMember.findFirst).toHaveBeenCalledTimes(
      2,
    );
  });
});
