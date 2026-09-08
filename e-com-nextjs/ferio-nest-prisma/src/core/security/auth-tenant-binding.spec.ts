import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@app/common';
import type { AuthenticatedRequest } from '../../../libs/common/src/types/http-request.type';
import type { UserPayload } from '../../../libs/common/src/types/user-payload.type';

describe('AuthGuard tenant binding', () => {
  const previousTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (previousTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = previousTenancy;
  });

  function setup(payload: UserPayload, isPublic = false) {
    const request = {
      headers: { authorization: 'Bearer signed-token' },
      tenantOrganizationId: 'org-a',
    } as unknown as AuthenticatedRequest;
    const guard = new AuthGuard(
      { verifyAsync: jest.fn().mockResolvedValue(payload) } as never,
      { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as never,
      { get: jest.fn().mockReturnValue('secret') } as never,
    );
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { guard, context, request };
  }

  it('accepts a token bound to the resolved tenant', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { guard, context, request } = setup({
      userId: 'user-1',
      email: 'user-1@example.test',
      role: 'customer',
      organizationId: 'org-a',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.organizationId).toBe('org-a');
  });

  it('rejects a valid token issued for another tenant', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { guard, context } = setup({
      userId: 'user-1',
      email: 'user-1@example.test',
      role: 'customer',
      organizationId: 'org-b',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not attach a cross-tenant token on public routes', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const { guard, context, request } = setup(
      {
        userId: 'user-1',
        email: 'user-1@example.test',
        role: 'customer',
        organizationId: 'org-b',
      },
      true,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('preserves legacy tokens when tenancy is disabled', async () => {
    process.env.TENANCY_ENABLED = 'false';
    const { guard, context } = setup({
      userId: 'legacy-user',
      email: 'legacy@example.test',
      role: 'customer',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
