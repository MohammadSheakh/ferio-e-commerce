import type { Request } from 'express';
import { TenancyController } from './tenancy.controller';

describe('TenancyController.status (MT-5)', () => {
  const makeController = (
    resolveMock: jest.Mock,
    orgFindUnique: jest.Mock = jest.fn(),
  ) => {
    const resolver = {
      resolveFromHost: resolveMock,
      effectiveHostFrom: (input: any) =>
        input.headers?.['x-forwarded-host'] ?? input.hostname,
    };
    const platform = { client: { organization: { findUnique: orgFindUnique } } };
    return new TenancyController(resolver as never, platform as never);
  };

  const request = (headers: Record<string, string>, hostname = 'proxy.local'): Request =>
    ({ headers, hostname } as unknown as Request);

  it('returns LEGACY when tenancy is disabled — no resolution attempted', async () => {
    process.env.TENANCY_ENABLED = 'false';
    const resolveMock = jest.fn();
    const controller = makeController(resolveMock);

    await expect(
      controller.status(request({ 'x-forwarded-host': 'acme.ferio.local' })),
    ).resolves.toEqual({ code: 'LEGACY' });
    expect(resolveMock).not.toHaveBeenCalled();
  });

  it('prefers x-forwarded-host over the proxy-local hostname', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const resolveMock =
      jest.fn().mockResolvedValue({ organizationId: 'org-1', hostname: 'acme.example.com' });
    const orgFindUnique =
      jest.fn().mockResolvedValue({ name: 'Acme Store' });
    const controller = makeController(resolveMock, orgFindUnique);

    await expect(
      controller.status(request({ 'x-forwarded-host': 'acme.example.com' }, 'internal.local')),
    ).resolves.toEqual({ code: 'ACTIVE', storeName: 'Acme Store' });
    expect(resolveMock).toHaveBeenCalledWith('acme.example.com');
  });

  it.each([
    ['TENANT_RESOLUTION_FAILED'],
    ['TENANT_SUSPENDED'],
    ['TENANT_UNAVAILABLE'],
    ['TENANT_MIGRATION_REQUIRED'],
  ] as const)('maps %s to a stable storefront state payload', async (code) => {
    process.env.TENANCY_ENABLED = 'true';
    const resolveMock = jest.fn().mockImplementation(() => {
      const error: any = new Error(code);
      error.response = { code };
      throw error;
    });
    const controller = makeController(resolveMock);

    await expect(controller.status(request({ host: 'x.example.com' }))).resolves.toEqual({
      code,
    });
  });

  it('rethrows unexpected failures instead of inventing states', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const resolveMock = jest.fn().mockRejectedValue(new Error('db down'));
    const controller = makeController(resolveMock);

    await expect(controller.status(request({}))).rejects.toThrow('db down');
  });
});
