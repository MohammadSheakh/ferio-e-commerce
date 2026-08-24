/**
 * MT-3/MT-4 database isolation + bootstrap integration suite.
 *
 * Requires TEST_DATABASE_URL pointing at a disposable PostgreSQL server with
 * permission to CREATE DATABASE (same guard pattern as the commerce
 * integration suites). Proves, against real PostgreSQL:
 *   1. the canonical migration set applies to a fresh tenant database;
 *   2. bootstrap is idempotent (second run applies nothing);
 *   3. baseline seed inserts safe defaults exactly once;
 *   4. two independently bootstrapped tenant databases are fully isolated —
 *      a product written to tenant A is invisible to tenant B.
 */
import { Pool } from 'pg';
import { TenantSchemaBootstrapper } from '../src/tenancy/tenant-schema.bootstrapper';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const conditionalDescribe = TEST_DATABASE_URL ? describe : describe.skip;

function serverConfig() {
  const url = new URL(TEST_DATABASE_URL as string);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

async function createScratchDatabase(prefix: string): Promise<string> {
  const config = serverConfig();
  const dbName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pool = new Pool({ ...config, database: 'postgres', max: 1 });
  await pool.query(`CREATE DATABASE "${dbName}"`);
  await pool.end();
  return dbName;
}

async function dropScratchDatabase(name: string): Promise<void> {
  const config = serverConfig();
  const pool = new Pool({ ...config, database: 'postgres', max: 1 });
  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await pool.query(`DROP DATABASE IF EXISTS "${name}"`);
  await pool.end();
}

conditionalDescribe('TenantSchemaBootstrapper (real PostgreSQL)', () => {
  let bootstrapper: TenantSchemaBootstrapper;
  const created: string[] = [];

  beforeAll(() => {
    bootstrapper = new TenantSchemaBootstrapper();
  });

  afterAll(async () => {
    for (const name of created) {
      await dropScratchDatabase(name).catch(() => undefined);
    }
  });

  it('applies the canonical migration set to a fresh tenant database and seeds safe defaults', async () => {
    const dbName = await createScratchDatabase('ferio_test_tenant_a');
    created.push(dbName);
    const connection = { ...serverConfig(), database: dbName };

    const result = await bootstrapper.bootstrap(connection);
    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.schemaVersion).not.toBe('empty');

    // Idempotency: second run applies nothing.
    const second = await bootstrapper.bootstrap(connection);
    expect(second.applied).toHaveLength(0);
    expect(second.schemaVersion).toBe(result.schemaVersion);

    // Baseline seed: defaults exist, COD verification at its safest mode.
    await bootstrapper.seedBaseline({ ...connection, organizationName: 'Tenant A' });
    const pool = new Pool({ ...connection, max: 1 });
    const settings = await pool.query<{ storeName: string }>(
      'SELECT "storeName" FROM "CommerceSettings" WHERE id = $1',
      ['default'],
    );
    const cod = await pool.query<{ mode: string }>(
      'SELECT "mode" FROM "CodVerificationPolicy" WHERE id = $1',
      ['default'],
    );
    expect(settings.rows[0]?.storeName).toBe('Tenant A');
    expect(cod.rows[0]?.mode).toBe('ALWAYS');
    // Seed re-run must not duplicate or error.
    await expect(
      bootstrapper.seedBaseline({ ...connection, organizationName: 'Overwritten?' }),
    ).resolves.toBeUndefined();
    const unchanged = await pool.query<{ storeName: string }>(
      'SELECT "storeName" FROM "CommerceSettings" WHERE id = $1',
      ['default'],
    );
    expect(unchanged.rows[0]?.storeName).toBe('Tenant A');
    await pool.end();
  }, 240_000);

  it('proves two bootstrapped tenant databases are fully isolated (MT-3 gate)', async () => {
    const [dbA, dbB] = await Promise.all([
      createScratchDatabase('ferio_test_iso_a'),
      createScratchDatabase('ferio_test_iso_b'),
    ]);
    created.push(dbA, dbB);
    const config = serverConfig();
    await bootstrapper.bootstrap({ ...config, database: dbA });
    await bootstrapper.bootstrap({ ...config, database: dbB });

    const poolA = new Pool({ ...config, database: dbA, max: 1 });
    const poolB = new Pool({ ...config, database: dbB, max: 1 });

    // Deliberately similar identifiers in both databases.
    await poolA.query(
      `INSERT INTO "Brand" ("id", "name", "slug") VALUES ('shared-brand-1', 'Shared Brand', 'shared-brand')`,
    );

    const seenInA = await poolA.query(`SELECT "name" FROM "Brand" WHERE id = 'shared-brand-1'`);
    const seenInB = await poolB.query(`SELECT "name" FROM "Brand" WHERE id = 'shared-brand-1'`);
    expect(seenInA.rowCount).toBe(1);
    expect(seenInB.rowCount).toBe(0); // tenant B cannot see tenant A's row

    // B can use the same identifier for its own data without collision.
    await poolB.query(
      `INSERT INTO "Brand" ("id", "name", "slug") VALUES ('shared-brand-1', 'B Own Brand', 'shared-brand')`,
    );
    const bOwn = await poolB.query(`SELECT "name" FROM "Brand" WHERE id = 'shared-brand-1'`);
    expect(bOwn.rows[0].name).toBe('B Own Brand');

    // Transaction rollback in A leaves B untouched.
    try {
      await poolA.query('BEGIN');
      await poolA.query(
        `INSERT INTO "Brand" ("id", "name", "slug") VALUES ('rollback-row', 'X', 'x')`,
      );
      throw new Error('forced');
    } catch {
      await poolA.query('ROLLBACK').catch(() => undefined);
    }
    const rollbackCheck = await poolA.query(`SELECT COUNT(*)::int AS c FROM "Brand"`);
    expect(rollbackCheck.rows[0].c).toBe(1);

    await Promise.all([poolA.end(), poolB.end()]);
  }, 240_000);

  it('proves tenant B cannot query tenant A products by ID even with identical identifiers (MT-7 §10.1)', async () => {
    const [dbA, dbB] = await Promise.all([
      createScratchDatabase('ferio_test_prod_a'),
      createScratchDatabase('ferio_test_prod_b'),
    ]);
    created.push(dbA, dbB);
    const config = serverConfig();
    await bootstrapper.bootstrap({ ...config, database: dbA });
    await bootstrapper.bootstrap({ ...config, database: dbB });

    // Both tenants create a category + product with IDENTICAL ids/slugs.
    for (const dbName of [dbA, dbB]) {
      const pool = new Pool({ ...config, database: dbName, max: 1 });
      await pool.query(
        `INSERT INTO "Category" ("id", "name", "slug") VALUES ('shared-cat-1', 'Shared', 'shared')`,
      );
      await pool.query(
        `INSERT INTO "Product" ("id", "name", "slug", "description", "status", "categoryId")
         VALUES ('shared-prod-1', 'Shared Product', 'shared-product', 'desc', 'DRAFT', 'shared-cat-1')`,
      );
      await pool.end();
    }

    // Tenant A publishes its product; B's stays DRAFT (unpublished).
    const poolA = new Pool({ ...config, database: dbA, max: 1 });
    await poolA.query(
      `UPDATE "Product" SET "status" = 'ACTIVE', "publishedAt" = now() WHERE id = 'shared-prod-1'`,
    );

    // A public storefront read in each database applies publish filters.
    const publicRead = async (dbName: string) => {
      const pool = new Pool({ ...config, database: dbName, max: 1 });
      const rows = await pool.query(
        `SELECT "id", "status" FROM "Product"
         WHERE id = 'shared-prod-1' AND "status" = 'ACTIVE' AND "publishedAt" <= now()`,
      );
      await pool.end();
      return rows.rowCount ?? 0;
    };

    expect(await publicRead(dbA)).toBe(1); // A sees its own published product
    expect(await publicRead(dbB)).toBe(0); // B sees nothing of A's — different DB AND unpublished there

    await poolA.end();
  }, 240_000);
});
