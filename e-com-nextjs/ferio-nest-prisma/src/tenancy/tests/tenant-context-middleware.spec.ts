import type { NextFunction, Request, Response } from 'express';
import { TenantContextMiddleware } from '../services/tenant-resolver.service';

describe('TenantContextMiddleware cache boundary', () => {
  const resolved = {
    organizationId: 'org-1',
    tenantDatabaseId: 'db-1',
    database: {
      id: 'db-1',
      host: 'localhost',
      port: 5432,
      databaseName: 'tenant_org_1',
      username: 'tenant_org_1',
      credentialCipher: 'ciphertext',
    },
    domainId: 'domain-1',
    hostname: 'store-a.ferio.local',
    subscriptionStatus: 'ACTIVE' as const,
  };

  function buildResponse() {
    const headers = new Map<string, string>();
    return {
      setHeader: jest.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value);
      }),
      getHeader: jest.fn((name: string) => headers.get(name.toLowerCase())),
      headers,
    };
  }

  it('prevents shared caches from serving a tenant response to another host', async () => {
    const resolver = {
      effectiveHostFrom: jest.fn().mockReturnValue('store-a.ferio.local'),
      resolveFromHost: jest.fn().mockResolvedValue(resolved),
    };
    const middleware = new TenantContextMiddleware(resolver as never);
    const response = buildResponse();
    const next = jest.fn() as NextFunction;
    const previous = process.env.TENANCY_ENABLED;
    process.env.TENANCY_ENABLED = 'true';

    middleware.use(
      { headers: {}, hostname: 'store-a.ferio.local', socket: {} } as Request,
      response as unknown as Response,
      next,
    );
    await new Promise<void>((resolvePromise) => setImmediate(resolvePromise));
    process.env.TENANCY_ENABLED = previous;

    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('x-forwarded-host');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves an existing Vary header when adding the tenant host boundary', async () => {
    const resolver = {
      effectiveHostFrom: jest.fn().mockReturnValue('store-a.ferio.local'),
      resolveFromHost: jest.fn().mockResolvedValue(resolved),
    };
    const middleware = new TenantContextMiddleware(resolver as never);
    const response = buildResponse();
    response.headers.set('vary', 'Origin');
    const next = jest.fn() as NextFunction;
    const previous = process.env.TENANCY_ENABLED;
    process.env.TENANCY_ENABLED = 'true';

    middleware.use(
      { headers: {}, hostname: 'store-a.ferio.local', socket: {} } as Request,
      response as unknown as Response,
      next,
    );
    await new Promise<void>((resolvePromise) => setImmediate(resolvePromise));
    process.env.TENANCY_ENABLED = previous;

    expect(response.headers.get('vary')).toBe('Origin, x-forwarded-host');
  });
});
