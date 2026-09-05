/**
 * MT-2 gate + MT-8 §11.1 negative proofs.
 *
 * 1. Two test hostnames resolve deterministically to two different
 *    organizations (MT-2 gate) — including through the positive cache path.
 * 2. Identical logical Redis/cache keys in two tenants can NEVER collide:
 *    OTP keys, settings cache entries, and the scopedRedisKey contract.
 */
import { runWithTenantContext, type TenantContext } from './tenant-context';
import { scopedRedisKey } from './redis-keys.util';
import { TenantResolverService } from './tenant-resolver.service';
import { SettingsService } from '../features/settings/services/settings.service';
import { OtpService } from '../features/authentication/otp/otp.service';

type CollisionPlatformDouble = {
  client: {
    tenantDomain: { findUnique: jest.Mock };
    tenantDatabase: { findUnique: jest.Mock };
  };
};

function tenantContext(
  organizationId: string,
  hostname: string,
): TenantContext {
  return Object.freeze({
    organizationId,
    tenantDatabaseId: `tdb-${organizationId}`,
    database: Object.freeze({
      id: `tdb-${organizationId}`,
      host: 'localhost',
      port: 5432,
      databaseName: `db_${organizationId}`,
      username: 'tester',
      credentialCipher: 'cipher',
    }),
    domainId: `dom-${organizationId}`,
    hostname,
    subscriptionStatus: 'ACTIVE' as const,
  });
}

describe('MT-2 gate: two hosts resolve deterministically to two organizations', () => {
  function resolverWithOrganizations() {
    const platform: CollisionPlatformDouble = {
      client: {
        tenantDomain: {
          findUnique: jest
            .fn()
            .mockImplementation(
              ({ where: { hostname } }: { where: { hostname: string } }) => {
                const slug = hostname.split('.')[0];
                if (!['tenant-a', 'tenant-b'].includes(slug)) return null;
                return Promise.resolve({
                  id: `dom-${slug}`,
                  hostname,
                  status: 'ACTIVE',
                  organization: {
                    id: `org-${slug}`,
                    status: 'ACTIVE',
                    subscription: { status: 'ACTIVE' },
                  },
                });
              },
            ),
        },
        tenantDatabase: {
          findUnique: jest
            .fn()
            .mockImplementation(
              ({
                where: { organizationId },
              }: {
                where: { organizationId: string };
              }) =>
                Promise.resolve({
                  id: `tdb-${organizationId}`,
                  organizationId,
                  status: 'READY',
                  schemaVersion: 'current',
                }),
            ),
        },
      },
    };
    const redis = { getClient: jest.fn().mockResolvedValue(null) };
    const service = new TenantResolverService(
      platform as never,
      redis as never,
    );
    return { service, redis };
  }

  it('resolves distinct hosts to their own organizations — never crossed', async () => {
    const { service } = resolverWithOrganizations();

    const a1 = await service.resolveFromHost('tenant-a.ferio.test');
    const b1 = await service.resolveFromHost('tenant-b.ferio.test');

    expect(a1.organizationId).toBe('org-tenant-a');
    expect(b1.organizationId).toBe('org-tenant-b');
    expect(a1.organizationId).not.toBe(b1.organizationId);
  });

  it('is deterministic on repeat resolution (positive cache path)', async () => {
    const { service, redis } = resolverWithOrganizations();

    const first = await service.resolveFromHost('tenant-a.ferio.test');
    // Second call hits the positive cache.
    redis.getClient.mockResolvedValueOnce({
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key.includes(':neg:') ? null : JSON.stringify(first),
        ),
    });
    const second = await service.resolveFromHost('tenant-a.ferio.test');
    const third = await service.resolveFromHost('tenant-a.ferio.test');

    expect(second.organizationId).toBe('org-tenant-a');
    expect(third.organizationId).toBe('org-tenant-a');
  });

  it('interleaved resolutions never leak one org into the other', async () => {
    const { service } = resolverWithOrganizations();

    for (let round = 0; round < 3; round += 1) {
      const seen: string[] = [];
      for (const host of ['tenant-b.ferio.test', 'tenant-a.ferio.test']) {
        const resolved = await service.resolveFromHost(host);
        seen.push(resolved.organizationId);
      }
      expect(seen).toEqual(['org-tenant-b', 'org-tenant-a']);
    }
  });
});

describe('MT-8 §11.1: identical record identifiers cannot collide across tenants', () => {
  it('scopedRedisKey namespaces identical parts per organization', () => {
    const keyInA = runWithTenantContext(
      tenantContext('org-a', 'a.ferio.test'),
      () => scopedRedisKey('otp', 'login', 'user@ferio.test'),
    );
    const keyInB = runWithTenantContext(
      tenantContext('org-b', 'b.ferio.test'),
      () => scopedRedisKey('otp', 'login', 'user@ferio.test'),
    );

    expect(keyInA).not.toBe(keyInB);
    expect(keyInA).toBe('t:org-a:otp:login:user@ferio.test');
    expect(keyInB).toBe('t:org-b:otp:login:user@ferio.test');
  });

  it('keeps the legacy key shape outside tenant contexts', () => {
    expect(scopedRedisKey('otp', 'login', 'user@ferio.test')).toBe(
      'otp:login:user@ferio.test',
    );
  });

  it('settings cache keys isolate the same settings type per organization', () => {
    process.env.PLATFORM_DB_CREDENTIAL_KEY ??=
      'ci-platform-db-credential-key-at-least-32-chars';
    const service = new SettingsService({} as never, {} as never, {} as never);
    const keyFor = (organizationId: string) =>
      runWithTenantContext(
        tenantContext(organizationId, `${organizationId}.ferio.test`),
        () =>
          (
            service as unknown as { getCacheKey(type: string): string }
          ).getCacheKey('hero_showcase'),
      );

    const keyA = keyFor('org-a');
    const keyB = keyFor('org-b');
    expect(keyA).toBe('settings:org-a:hero_showcase');
    expect(keyB).toBe('settings:org-b:hero_showcase');
    expect(keyA).not.toBe(keyB);
  });

  it('OTP keys isolate the same email per organization', () => {
    const otp = new OtpService({} as never);

    const keyInA = runWithTenantContext(
      tenantContext('org-a', 'a.ferio.test'),
      () =>
        (
          otp as unknown as {
            getOtpKey(email: string, type: string): string;
          }
        ).getOtpKey('shared@ferio.test', 'LOGIN'),
    );
    const keyInB = runWithTenantContext(
      tenantContext('org-b', 'b.ferio.test'),
      () =>
        (
          otp as unknown as {
            getOtpKey(email: string, type: string): string;
          }
        ).getOtpKey('shared@ferio.test', 'LOGIN'),
    );

    expect(keyInA).toContain('t:org-a:');
    expect(keyInB).toContain('t:org-b:');
    expect(keyInA).not.toBe(keyInB);
  });
});
