import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import {
  runWithTenantContext,
  type TenantContext,
} from '../context/tenant-context';
import { TenantSuspensionGuard } from '../guards/tenant-suspension.guard';

type RequestStub = {
  method: string;
  path: string;
  originalUrl: string;
};

function suspendedContext(): TenantContext {
  return Object.freeze({
    organizationId: 'org-1',
    tenantDatabaseId: 'tdb-1',
    database: Object.freeze({
      id: 'tdb-1',
      host: 'localhost',
      port: 5432,
      databaseName: 'tenant',
      username: 'tenant',
      credentialCipher: 'cipher',
    }),
    domainId: 'domain-1',
    hostname: 'suspended.example.com',
    subscriptionStatus: 'SUSPENDED' as const,
  });
}

function contextFor(request: RequestStub): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantSuspensionGuard (PO-005-R)', () => {
  const guard = new TenantSuspensionGuard();

  it('blocks suspended-tenant commerce mutations', () => {
    expect(() =>
      runWithTenantContext(suspendedContext(), () =>
        guard.canActivate(
          contextFor({
            method: 'POST',
            path: '/api/v1/cart/items',
            originalUrl: '/api/v1/cart/items',
          }),
        ),
      ),
    ).toThrow(new ForbiddenException('COMMERCE_MUTATION_DISABLED_SUSPENDED'));
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows %s reads/preflights',
    (method) => {
      expect(
        runWithTenantContext(suspendedContext(), () =>
          guard.canActivate(
            contextFor({
              method,
              path: '/api/v1/catalog/products',
              originalUrl: '/api/v1/catalog/products',
            }),
          ),
        ),
      ).toBe(true);
    },
  );

  it.each(['/api/v1/auth/login', '/api/v1/auth/admin/login'])(
    'allows authentication request %s',
    (path) => {
      expect(
        runWithTenantContext(suspendedContext(), () =>
          guard.canActivate(
            contextFor({ method: 'POST', path, originalUrl: path }),
          ),
        ),
      ).toBe(true);
    },
  );

  it('does not restrict requests without a tenant context', () => {
    expect(
      guard.canActivate(
        contextFor({
          method: 'POST',
          path: '/api/v1/platform/auth/login',
          originalUrl: '/api/v1/platform/auth/login',
        }),
      ),
    ).toBe(true);
  });
});
