import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { tryGetTenantContext } from '../context/tenant-context';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Enforces the platform suspension policy at the HTTP boundary. Authentication
 * must remain available so tenant operators can sign in and recover access;
 * commerce writes are blocked before a feature controller can mutate data.
 */
@Injectable()
export class TenantSuspensionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const tenant = tryGetTenantContext();
    if (!tenant || tenant.subscriptionStatus !== 'SUSPENDED') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();
    if (READ_METHODS.has(method) || this.isAuthenticationRequest(request)) {
      return true;
    }

    throw new ForbiddenException('COMMERCE_MUTATION_DISABLED_SUSPENDED');
  }

  private isAuthenticationRequest(request: Request): boolean {
    const path = request.path || request.originalUrl.split('?')[0];
    return /(?:^|\/)auth(?:\/|$)/.test(path);
  }
}
