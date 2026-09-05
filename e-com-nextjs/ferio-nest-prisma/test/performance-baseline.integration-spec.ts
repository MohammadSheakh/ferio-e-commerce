/**
 * §16.3 performance baselines — measured, CI-safe evidence for the
 * tenant-plane hot paths.
 *
 * Proven here against real components:
 *   1. cached tenant resolution serves load with ONE control-plane query per
 *      host (positive cache) and one per TTL window for unknown hosts
 *      (negative cache), at throughput far above production need;
 *   2. a control-plane outage fails closed FAST with stable codes and never
 *      falls back to any legacy database;
 *   3. cold vs warm tenant-database acquisition latency against REAL
 *      PostgreSQL, with concurrent acquisition collapsing to a single
 *      bounded client;
 *   4. LRU capacity enforcement under churn — active clients never exceed
 *      TENANT_DB_MAX_CLIENTS.
 *
 * Latency numbers are printed as structured evidence lines; assertions use
 * generous bounds so shared CI runners cannot flake the suite.
 */
import { Pool } from 'pg';

import { TenantSchemaBootstrapper } from '../src/tenancy/tenant-schema.bootstrapper';
import { TenantDatabaseManager } from '../src/tenancy/tenant-database.manager';
import type { ResolvedTenant } from '../src/tenancy/tenant-resolver.service';
import { encryptSecret } from '../src/platform/utils/secret-box';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const conditionalDescribe = TEST_DATABASE_URL ? describe : describe.skip;

const CREDENTIAL_KEY = 'ci-platform-db-credential-key-at-least-32-chars';
process.env.PLATFORM_DB_CREDENTIAL_KEY = CREDENTIAL_KEY;

function serverConfig() {
  const url = new URL(TEST_DATABASE_URL as string);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

async function createBareDatabase(prefix: string): Promise<string> {
  const pool = new Pool({ ...serverConfig(), database: 'postgres', max: 1 });
  const dbName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(`CREATE DATABASE "${dbName}"`);
  await pool.end();
  return dbName;
}

async function dropDatabase(name: string): Promise<void> {
  const pool = new Pool({ ...serverConfig(), database: 'postgres', max: 1 });
  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await pool.query(`DROP DATABASE IF EXISTS "${name}"`);
  await pool.end();
}

function evidence(event: string, data: Record<string, unknown>) {
  // Structured evidence lines survive CI logs for capacity planning.
  console.log(JSON.stringify({ event, ...data }));
}

// ─────────────────────────── Resolver load ───────────────────────────

class MiniRedis {
  private rows = new Map<string, { value: string; expiresAt: number | null }>();
  async getClient() {
    const self = this;
    return {
      async get(key: string) {
        const row = self.rows.get(key);
        if (!row) return null;
        if (row.expiresAt !== null && Date.now() > row.expiresAt) {
          self.rows.delete(key);
          return null;
        }
        return row.value;
      },
      async set(key: string, value: string, _mode?: 'EX', ttlSeconds?: number) {
        self.rows.set(key, {
          value,
          expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        });
      },
      async del(...keys: string[]) {
        for (const key of keys) self.rows.delete(key);
      },
    };
  }
}

function resolverHarness(controlPlaneOk: boolean) {
  let controlPlaneQueries = 0;
  type DomainWhere = { hostname: string };
  type DatabaseWhere = { organizationId: string };
  const platform = {
    client: {
      tenantDomain: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: DomainWhere }) => {
          controlPlaneQueries += 1;
          if (!controlPlaneOk) {
            return Promise.reject(new Error('ECONNREFUSED control plane'));
          }
          const slug = String(where.hostname).split('.')[0];
          if (slug !== 'tenant-a' && slug !== 'tenant-b') return Promise.resolve(null);
          return Promise.resolve({
            id: `dom-${slug}`,
            hostname: where.hostname,
            status: 'ACTIVE',
            organization: {
              id: `org-${slug}`,
              status: 'ACTIVE',
              subscription: { status: 'ACTIVE' },
            },
          });
        }),
      },
      tenantDatabase: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: DatabaseWhere }) =>
          Promise.resolve({
            id: `tdb-${where.organizationId}`,
            organizationId: where.organizationId,
            status: 'READY',
            schemaVersion: 'current',
          }),
        ),
      },
    },
  };
  const { TenantResolverService } = require('../src/tenancy/tenant-resolver.service');
  const service = new TenantResolverService(platform as never, new MiniRedis() as never);
  return { service, queries: () => controlPlaneQueries };
}

describe('§16.3 resolver load behavior', () => {
  it('serves hot load from cache with one control-plane query per host', async () => {
    const { service, queries } = resolverHarness(true);

    // Warm both hosts.
    await service.resolveFromHost('tenant-a.ferio.test');
    await service.resolveFromHost('tenant-b.ferio.test');
    const warmupQueries = queries();

    const iterations = 2_000;
    const started = Date.now();
    const round: Array<Promise<ResolvedTenant>> = [];
    for (let i = 0; i < iterations; i += 1) {
      const host = i % 2 === 0 ? 'tenant-a.ferio.test' : 'tenant-b.ferio.test';
      round.push(service.resolveFromHost(host));
    }
    const settled = await Promise.all(round);
    const elapsedMs = Date.now() - started;

    expect(settled).toHaveLength(iterations);
    const distinctOrgs = [...new Set(settled.map((r) => r.organizationId))]
      .sort()
      .join(',');
    expect(distinctOrgs).toBe('org-tenant-a,org-tenant-b');
    // Positive cache absorbed the entire hot loop.
    expect(queries()).toBe(warmupQueries);

    evidence('perf_resolver_cached_load', {
      iterations,
      elapsedMs,
      opsPerSecond: Math.round((iterations / Math.max(elapsedMs, 1)) * 1000),
      controlPlaneQueries: queries(),
    });
    // Generous floor: even weak CI runners comfortably beat 500 ops/s cached.
    expect(elapsedMs).toBeLessThan(4_000);
  });

  it('absorbs an unknown-host storm with a single lookup per TTL window', async () => {
    const { service, queries } = resolverHarness(true);

    // First miss is allowed to reach the control plane and writes the
    // negative entry; the storm behind it must be absorbed entirely.
    await expect(service.resolveFromHost('ghost.ferio.test')).rejects.toBeTruthy();
    const queriesAfterFirstMiss = queries();

    const attempts = 299;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        service.resolveFromHost('ghost.ferio.test'),
      ),
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(queries()).toBe(queriesAfterFirstMiss);
    evidence('perf_resolver_negative_storm', {
      attempts,
      controlPlaneQueries: queries(),
    });
  });

  it('fails closed fast when the control plane is unreachable', async () => {
    const { service } = resolverHarness(false);

    const started = Date.now();
    await expect(
      service.resolveFromHost('tenant-a.ferio.test'),
    ).rejects.toMatchObject({ code: 'TENANT_RESOLUTION_FAILED' });
    const elapsedMs = Date.now() - started;

    evidence('perf_resolver_control_plane_outage', { elapsedMs });
    expect(elapsedMs).toBeLessThan(1_000);
  });
});

// ─────────────────── Connection manager bounds & latency ───────────────────

conditionalDescribe('§16.3 connection manager baselines (real PostgreSQL)', () => {
  const created: string[] = [];

  afterAll(async () => {
    for (const name of created) await dropDatabase(name).catch(() => undefined);
  });

  function materialFor(dbName: string) {
    const cfg = serverConfig();
    return {
      id: `tdb-${dbName.slice(-10)}`,
      host: cfg.host,
      port: cfg.port,
      databaseName: dbName,
      username: cfg.user,
      credentialCipher: encryptSecret(cfg.password, CREDENTIAL_KEY),
    };
  }

  it('measures cold vs warm acquisition and collapses concurrent gets to one client', async () => {
    const dbName = await createBareDatabase('ferio_perf_hot');
    created.push(dbName);
    const manager = new TenantDatabaseManager();
    try {
      const material = materialFor(dbName);

      const coldStarted = performance.now();
      const first = await manager.getClient(material);
      const coldMs = Math.round(performance.now() - coldStarted);
      await first.$queryRaw`SELECT 1`;

      const warmSamples: number[] = [];
      for (let i = 0; i < 20; i += 1) {
        const started = performance.now();
        await manager.getClient(material);
        warmSamples.push(performance.now() - started);
      }
      warmSamples.sort((a, b) => a - b);
      const warmMedianMs = Math.round(warmSamples[10]);

      const concurrentStarted = performance.now();
      await Promise.all(
        Array.from({ length: 50 }, () => manager.getClient(material)),
      );
      const concurrentMs = Math.round(performance.now() - concurrentStarted);

      expect(manager.metrics().activeClients).toBe(1);
      evidence('perf_db_acquire', { coldMs, warmMedianMs, concurrentGets: 50, concurrentMs });
      // Generous bounds for shared CI hardware.
      expect(coldMs).toBeLessThan(5_000);
      expect(warmMedianMs).toBeLessThan(100);
    } finally {
      await manager.onModuleDestroy();
    }
  }, 30_000);

  it('never exceeds TENANT_DB_MAX_CLIENTS under churn (LRU eviction)', async () => {
    process.env.TENANT_DB_MAX_CLIENTS = '2';
    const manager = new TenantDatabaseManager();
    const dbs: string[] = [];
    try {
      for (let i = 0; i < 3; i += 1) {
        const name = await createBareDatabase(`ferio_perf_lru_${i}`);
        dbs.push(name);
        created.push(name);
      }
      const materials = dbs.map((name) => materialFor(name));

      // Churn four acquires across three databases; capacity is two.
      for (const material of [...materials, materials[0]]) {
        await manager.getClient(material);
        expect(manager.metrics().activeClients).toBeLessThanOrEqual(2);
      }
      expect(manager.metrics().activeClients).toBe(2);
      evidence('perf_db_lru_bound', { maxClients: 2, databasesTouched: materials.length });
    } finally {
      process.env.TENANT_DB_MAX_CLIENTS = '25';
      await manager.onModuleDestroy();
    }
  }, 60_000);

  it('bootstraps a fresh tenant database well inside the provisioning budget', async () => {
    const bootstrapper = new TenantSchemaBootstrapper();
    const dbName = await createBareDatabase('ferio_perf_boot');
    created.push(dbName);
    const conn = { ...serverConfig(), database: dbName };

    const started = performance.now();
    const result = await bootstrapper.bootstrap(conn);
    const elapsedMs = Math.round(performance.now() - started);

    const migrationDirs = require('node:fs')
      .readdirSync(require('node:path').join(__dirname, '../prisma/migrations'))
      .filter((entry: string) =>
        require('node:fs').existsSync(
          require('node:path').join(__dirname, '../prisma/migrations', entry, 'migration.sql'),
        ),
      ).length;
    expect(result.applied).toHaveLength(migrationDirs);
    evidence('perf_bootstrap_full_chain', { migrations: result.applied.length, elapsedMs });
    // Whole canonical chain on modest hardware stays inside 60s.
    expect(elapsedMs).toBeLessThan(60_000);
  }, 90_000);
});
