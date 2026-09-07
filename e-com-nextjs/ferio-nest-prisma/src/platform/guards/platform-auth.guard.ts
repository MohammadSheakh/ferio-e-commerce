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
import type { Request } from 'express';

export interface PlatformPrincipal {
  platformUserId: string;
  email: string;
  roles: string[];
}

type PlatformRequest = Request & { platformPrincipal?: PlatformPrincipal };

export const PLATFORM_PERMISSION = {
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_WRITE: 'organization:write',
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_WRITE: 'subscription:write',
  BILLING_READ: 'saas_billing:read',
  BILLING_WRITE: 'saas_billing:write',
  DOMAIN_WRITE: 'domain:write',
  PROVISIONING_RUN: 'provisioning:run',
  MIGRATION_RUN: 'migration:run',
  SUPPORT_ACCESS_REQUEST: 'support_access:request',
  PLATFORM_HEALTH_READ: 'platform_health:read',
  TENANT_DATABASE_READ: 'tenant_db:read',
  USAGE_READ: 'usage:read',
  AUDIT_READ: 'audit:read',
} as const;

export type PlatformPermission =
  (typeof PLATFORM_PERMISSION)[keyof typeof PLATFORM_PERMISSION];

type PlatformRole = 'SUPERADMIN' | 'OPS' | 'SUPPORT' | 'BILLING';
type PlatformGrantedPermission = PlatformPermission | '*';

/** Role → permission map; SUPERADMIN is the only wildcard realm role. */
const ROLE_PERMISSIONS: Record<
  PlatformRole,
  readonly PlatformGrantedPermission[]
> = {
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
    'platform_health:read',
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
export const PlatformPermissions = (...permissions: PlatformPermission[]) =>
  SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);

function permissionsFor(principal: PlatformPrincipal): Set<string> {
  const granted = new Set<string>();
  for (const role of principal.roles) {
    if (!isPlatformRole(role)) continue;
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

function isPlatformRole(value: string): value is PlatformRole {
  return value in ROLE_PERMISSIONS;
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
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    const requestPath = String(request.path ?? request.url ?? '').split('?')[0];
    // Platform login is the credential-exchange endpoint and therefore cannot
    // require the platform bearer token it is responsible for issuing.
    if (
      request.method === 'POST' &&
      requestPath.endsWith('/platform/auth/login')
    ) {
      return true;
    }
    const authorization: unknown = request.headers.authorization;
    const header =
      typeof authorization === 'string'
        ? authorization
        : Array.isArray(authorization) &&
            authorization.every(
              (value): value is string => typeof value === 'string',
            )
          ? authorization[0]
          : undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('PLATFORM_AUTH_REQUIRED');
    }
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(header.slice(7), {
        secret: process.env.PLATFORM_JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('PLATFORM_TOKEN_INVALID');
    }
    if (!isPlatformTokenPayload(payload)) {
      throw new UnauthorizedException('PLATFORM_REALM_MISMATCH');
    }
    const principal: PlatformPrincipal = {
      platformUserId: payload.sub,
      email: payload.email ?? '',
      roles: payload.roles,
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

type PlatformTokenPayload = {
  realm: 'platform';
  sub: string;
  email?: string;
  roles: string[];
};

function isPlatformTokenPayload(value: unknown): value is PlatformTokenPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.realm === 'platform' &&
    typeof payload.sub === 'string' &&
    payload.sub.length > 0 &&
    (payload.email === undefined || typeof payload.email === 'string') &&
    Array.isArray(payload.roles) &&
    payload.roles.every((role) => typeof role === 'string')
  );
}
