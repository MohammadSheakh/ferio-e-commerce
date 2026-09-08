import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { PLATFORM_PERMISSION, PlatformAuthGuard } from './platform-auth.guard';

type GuardRequest = {
  method: string;
  path: string;
  headers: { authorization?: string };
  platformPrincipal?: unknown;
};

type GuardDouble = {
  verifyAsync: jest.Mock;
};

function contextFor(request: GuardRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe('PlatformAuthGuard (separate authorization realm)', () => {
  const originalSecret = process.env.PLATFORM_JWT_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PLATFORM_JWT_SECRET;
    else process.env.PLATFORM_JWT_SECRET = originalSecret;
  });

  function build() {
    const jwt: GuardDouble = { verifyAsync: jest.fn() };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    };
    return {
      guard: new PlatformAuthGuard(jwt as never, reflector as never),
      jwt,
      reflector,
    };
  }

  it('bypasses bearer verification only for the platform login endpoint', async () => {
    const { guard, jwt } = build();
    const request: GuardRequest = {
      method: 'POST',
      path: '/api/v1/platform/auth/login',
      headers: {},
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects requests without a platform bearer token', async () => {
    const { guard } = build();
    const request: GuardRequest = {
      method: 'GET',
      path: '/api/v1/platform/organizations',
      headers: {},
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid tenant-realm token on a platform route', async () => {
    process.env.PLATFORM_JWT_SECRET = 'platform-secret';
    const { guard, jwt } = build();
    jwt.verifyAsync.mockResolvedValue({
      realm: 'tenant',
      sub: 'tenant-user-1',
      email: 'owner@example.com',
      roles: ['OWNER'],
    });
    const request: GuardRequest = {
      method: 'GET',
      path: '/api/v1/platform/organizations',
      headers: { authorization: 'Bearer tenant-token' },
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      message: 'PLATFORM_REALM_MISMATCH',
    });
    expect(jwt.verifyAsync).toHaveBeenCalledWith('tenant-token', {
      secret: 'platform-secret',
    });
    expect(request.platformPrincipal).toBeUndefined();
  });

  it('accepts platform tokens and attaches a platform-only principal', async () => {
    process.env.PLATFORM_JWT_SECRET = 'platform-secret';
    const { guard, jwt } = build();
    jwt.verifyAsync.mockResolvedValue({
      realm: 'platform',
      sub: 'platform-user-1',
      email: 'ops@example.com',
      roles: ['OPS'],
    });
    const request: GuardRequest = {
      method: 'GET',
      path: '/api/v1/platform/organizations',
      headers: { authorization: 'Bearer platform-token' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.platformPrincipal).toEqual({
      platformUserId: 'platform-user-1',
      email: 'ops@example.com',
      roles: ['OPS'],
    });
  });

  it('enforces platform permissions after realm verification', async () => {
    const { guard, jwt, reflector } = build();
    jwt.verifyAsync.mockResolvedValue({
      realm: 'platform',
      sub: 'platform-user-1',
      roles: ['SUPPORT'],
    });
    reflector.getAllAndOverride.mockReturnValue(['organization:write']);
    const request: GuardRequest = {
      method: 'POST',
      path: '/api/v1/platform/organizations',
      headers: { authorization: 'Bearer platform-token' },
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.platformPrincipal).toMatchObject({
      platformUserId: 'platform-user-1',
    });
  });

  it('keeps platform health behind its dedicated permission', async () => {
    const { guard, jwt, reflector } = build();
    jwt.verifyAsync.mockResolvedValue({
      realm: 'platform',
      sub: 'platform-user-1',
      roles: ['SUPPORT'],
    });
    reflector.getAllAndOverride.mockReturnValue([
      PLATFORM_PERMISSION.PLATFORM_HEALTH_READ,
    ]);
    const request: GuardRequest = {
      method: 'GET',
      path: '/api/v1/platform/domain-health',
      headers: { authorization: 'Bearer platform-token' },
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      message: 'PLATFORM_PERMISSION_DENIED',
    });
  });
});
