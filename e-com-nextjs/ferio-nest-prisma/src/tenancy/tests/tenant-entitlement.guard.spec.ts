import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TenantEntitlementGuard,
  REQUIRE_ENTITLEMENT_KEY,
  type TenantEntitlementRequest,
} from '../guards/tenant-entitlement.guard';
import { runWithTenantContext } from '../context/tenant-context';
import type { EntitlementsService } from '../../platform/services/entitlements.service';

describe('TenantEntitlementGuard', () => {
  let reflector: Reflector;
  let entitlementsService: jest.Mocked<
    Pick<EntitlementsService, 'evaluate' | 'isEnabled'>
  >;
  let guard: TenantEntitlementGuard;

  const originalTenancyEnabled = process.env.TENANCY_ENABLED;

  beforeEach(() => {
    process.env.TENANCY_ENABLED = 'true';
    reflector = new Reflector();
    entitlementsService = {
      evaluate: jest.fn(),
      isEnabled: jest.fn(),
    } as unknown as jest.Mocked<Pick<EntitlementsService, 'evaluate' | 'isEnabled'>>;
    guard = new TenantEntitlementGuard(
      reflector,
      entitlementsService as unknown as EntitlementsService,
    );
  });

  afterEach(() => {
    process.env.TENANCY_ENABLED = originalTenancyEnabled;
  });

  function mockContext(
    featureKey?: string,
    requestOverride: Partial<TenantEntitlementRequest> = {},
  ): ExecutionContext {
    const request: TenantEntitlementRequest = {
      ...requestOverride,
    } as TenantEntitlementRequest;

    jest.spyOn(reflector, 'get').mockImplementation((key) => {
      if (key === REQUIRE_ENTITLEMENT_KEY) return featureKey;
      return undefined;
    });

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows through when TENANCY_ENABLED is false (legacy mode)', async () => {
    process.env.TENANCY_ENABLED = 'false';
    const ctx = mockContext('warranty_management');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(entitlementsService.evaluate).not.toHaveBeenCalled();
  });

  it('allows through when no @RequireEntitlement metadata is present', async () => {
    const ctx = mockContext(undefined);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(entitlementsService.evaluate).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when tenancy is enabled but no tenant context exists', async () => {
    const ctx = mockContext('warranty_management');

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      new ForbiddenException('TENANT_CONTEXT_REQUIRED'),
    );
  });

  it('evaluates entitlement against the ambient organization and allows when enabled', async () => {
    const ctx = mockContext('warranty_management');
    entitlementsService.evaluate.mockResolvedValueOnce({
      allowed: true,
      limit: null,
    });

    const tenant = {
      organizationId: 'org_test_1',
      databaseUrl: 'postgres://localhost/test',
      tenantDatabaseId: 'tdb_1',
      subscriptionStatus: 'ACTIVE',
      domains: [],
    };

    let result = false;
    await runWithTenantContext(tenant, async () => {
      result = await guard.canActivate(ctx);
    });

    expect(result).toBe(true);
    expect(entitlementsService.evaluate).toHaveBeenCalledWith(
      'org_test_1',
      'warranty_management',
    );
    const req = ctx.switchToHttp().getRequest<TenantEntitlementRequest>();
    expect(req.tenantEntitlement).toEqual({ allowed: true, limit: null });
  });

  it('evaluates entitlement and throws ForbiddenException when denied', async () => {
    const ctx = mockContext('customer_wallet');
    entitlementsService.evaluate.mockResolvedValueOnce({
      allowed: false,
      code: 'FEATURE_DISABLED',
    });

    const tenant = {
      organizationId: 'org_test_2',
      databaseUrl: 'postgres://localhost/test',
      tenantDatabaseId: 'tdb_2',
      subscriptionStatus: 'ACTIVE',
      domains: [],
    };

    await expect(
      runWithTenantContext(tenant, async () => {
        await guard.canActivate(ctx);
      }),
    ).rejects.toThrow(new ForbiddenException('FEATURE_DISABLED'));
  });
});

