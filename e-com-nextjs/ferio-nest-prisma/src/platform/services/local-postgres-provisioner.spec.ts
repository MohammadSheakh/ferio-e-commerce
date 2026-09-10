jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

import { Pool } from 'pg';
import { LocalPostgresProvisioner } from './local-postgres-provisioner';

describe('LocalPostgresProvisioner', () => {
  const originalPlatformDatabaseUrl = process.env.PLATFORM_DATABASE_URL;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalPlatformDatabaseUrl === undefined) {
      delete process.env.PLATFORM_DATABASE_URL;
    } else {
      process.env.PLATFORM_DATABASE_URL = originalPlatformDatabaseUrl;
    }
  });

  it('reconciles a role left by a partial run before returning its password', async () => {
    process.env.PLATFORM_DATABASE_URL =
      'postgresql://ferio:ferio@localhost:5433/ferio_platform';
    const query = jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: '42710' })
      .mockResolvedValue({});
    const end = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    (Pool as unknown as jest.Mock).mockImplementation(() => ({ query, end }));

    const result = await new LocalPostgresProvisioner().createTenantDatabase({
      organizationId: 'org-12345678',
      slug: 'acme-shop',
    });

    expect(result.username).toMatch(/^tenant_[a-f0-9]{24}$/);
    expect(query).toHaveBeenCalledTimes(4);
    const queryCalls = query.mock.calls as unknown as Array<[unknown]>;
    expect(queryCalls[2]?.[0]).toEqual(
      expect.stringMatching(/^ALTER ROLE "tenant_[a-f0-9]{24}" PASSWORD '/),
    );
    expect(queryCalls[3]?.[0]).toEqual(
      expect.stringContaining('GRANT ALL PRIVILEGES ON DATABASE'),
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('does not hide non-duplicate role creation errors', async () => {
    process.env.PLATFORM_DATABASE_URL =
      'postgresql://ferio:ferio@localhost:5433/ferio_platform';
    const query = jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: '42501' });
    const end = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    (Pool as unknown as jest.Mock).mockImplementation(() => ({ query, end }));

    await expect(
      new LocalPostgresProvisioner().createTenantDatabase({
        organizationId: 'org-12345678',
        slug: 'acme-shop',
      }),
    ).rejects.toEqual({ code: '42501' });
    expect(end).toHaveBeenCalledTimes(1);
  });
});
