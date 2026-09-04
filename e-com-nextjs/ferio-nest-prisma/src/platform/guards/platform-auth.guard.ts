import {
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export interface PlatformPrincipal {
  platformUserId: string;
  email: string;
  roles: string[];
}

/** Role → permission map; SUPERADMIN is the only wildcard realm role. */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ['*'],
  OPS: [
    'organization:read',
    'organization:write',
    'provisioning:run',
    'domain:write',
    'migration:run',
    'tenant_db:read',
    'usage:read',
    'audit:read',
  ],
  SUPPORT: [
    'organization:read',
    'support_access:request',
    'audit:read',
    'usage:read',
  ],
  BILLING: [
    'organization:read',
    'subscription:read',
    'subscription:write',
    'saas_billing:read',
    'saas_billing:write',
  ],
};

export const PLATFORM_PERMISSIONS_KEY = 'platform_permissions';
export const PlatformPermissions = (...permissions: string[]) =>
  SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);

function permissionsFor(principal: PlatformPrincipal): Set<string> {
  const granted = new Set<string>();
  for (const role of principal.roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

/**
 * Separate authorization realm (ADR-0004): a valid platform token never
 * implies tenant access, and tenant tokens are worthless here. Tokens carry
 * realm=platform and are signed with PLATFORM_JWT_SECRET — distinct from the
 * storefront/admin secret.
 */
@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requestPath = String(request.path ?? request.url ?? '').split('?')[0];
    // Platform login is the credential-exchange endpoint and therefore cannot
    // require the platform bearer token it is responsible for issuing.
    if (
      request.method === 'POST' &&
      requestPath.endsWith('/platform/auth/login')
    ) {
      return true;
    }
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('PLATFORM_AUTH_REQUIRED');
    }
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(header.slice(7), {
        secret: process.env.PLATFORM_JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('PLATFORM_TOKEN_INVALID');
    }
    if (payload?.realm !== 'platform' || !payload?.sub) {
      throw new UnauthorizedException('PLATFORM_REALM_MISMATCH');
    }
    const principal: PlatformPrincipal = {
      platformUserId: payload.sub,
      email: String(payload.email ?? ''),
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
    };
    request.platformPrincipal = principal;

    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const granted = permissionsFor(principal);
    const ok =
      granted.has('*') ||
      required.every((permission) => granted.has(permission));
    if (!ok) throw new ForbiddenException('PLATFORM_PERMISSION_DENIED');
    return true;
  }
}
