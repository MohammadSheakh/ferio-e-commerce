import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tryGetTenantContext } from '../context/tenant-context';
import {
  EntitlementsService,
  type EntitlementDecision,
} from '../../platform/services/entitlements.service';

export const REQUIRE_ENTITLEMENT_KEY = 'require_entitlement';

/**
 * Decorates a controller method or class with a required commercial SaaS
 * feature entitlement (SPEC-0001 / ADR-0006 / ADR-0010).
 */
export const RequireEntitlement = (featureKey: string) =>
  SetMetadata(REQUIRE_ENTITLEMENT_KEY, featureKey.trim().toLowerCase());

export type TenantEntitlementRequest = Request & {
  tenantEntitlement?: EntitlementDecision;
};

/**
 * Enforces per-tenant plan entitlements and per-merchant overrides at the HTTP
 * boundary before feature services execute business logic (ADR-0006 / ADR-0010).
 *
 * Evaluation rules:
 * 1. Legacy mode (TENANCY_ENABLED != 'true'): passthrough.
 * 2. If no @RequireEntitlement is present on handler/controller: passthrough.
 * 3. Resolves trusted organizationId from ambient TenantContext.
 * 4. Evaluates EntitlementsService (Active Override > Plan Entitlement > System Default).
 * 5. If disallowed: throws ForbiddenException('FEATURE_DISABLED' | 'PLAN_LIMIT_REACHED' | ...).
 */
@Injectable()
export class TenantEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      return true;
    }

    const featureKey =
      this.reflector.get<string | undefined>(
        REQUIRE_ENTITLEMENT_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string | undefined>(
        REQUIRE_ENTITLEMENT_KEY,
        context.getClass(),
      );

    if (!featureKey) {
      return true;
    }

    const tenant = tryGetTenantContext();
    if (!tenant?.organizationId) {
      throw new ForbiddenException('TENANT_CONTEXT_REQUIRED');
    }

    const decision = await this.entitlements.evaluate(
      tenant.organizationId,
      featureKey,
    );

    if (!decision.allowed) {
      throw new ForbiddenException(decision.code ?? 'FEATURE_DISABLED');
    }

    const req = context.switchToHttp().getRequest<TenantEntitlementRequest>();
    req.tenantEntitlement = decision;

    return true;
  }
}

