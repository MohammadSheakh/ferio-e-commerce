import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

async function migrateFleet() {
  const platformUrl =
    process.env.PLATFORM_DATABASE_URL ||
    'postgresql://ferio:ferio@postgres:5432/ferio_platform';

  const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
  if (!existsSync(migrationsDir)) {
    console.log('[FleetMigrate] No prisma/migrations directory found. Skipping.');
    return;
  }

  const allMigrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(migrationsDir, name, 'migration.sql')))
    .sort();

  console.log(`[FleetMigrate] Found ${allMigrations.length} canonical migrations.`);

  const platformPool = new Pool({ connectionString: platformUrl });
  let tenantDatabases = [];

  try {
    const res = await platformPool.query(
      `SELECT "id", "organizationId", "databaseName", "host", "port", "username", "schemaVersion" FROM "TenantDatabase" WHERE "status" = 'READY'`
    );
    tenantDatabases = res.rows;
  } catch (err) {
    console.warn('[FleetMigrate] Unable to query TenantDatabase from platform DB:', err.message);
    await platformPool.end();
    return;
  }

  console.log(`[FleetMigrate] Discovered ${tenantDatabases.length} active tenant database(s).`);

  for (const tdb of tenantDatabases) {
    const dbName = tdb.databaseName;
    console.log(`[FleetMigrate] Synchronizing tenant DB "${dbName}"...`);

    // Connect using postgres superuser credentials from environment
    const tenantHost = process.env.POSTGRES_HOST || tdb.host || 'postgres';
    const tenantPort = process.env.POSTGRES_PORT || tdb.port || 5432;
    const tenantUser = process.env.POSTGRES_USER || 'ferio';
    const tenantPassword = process.env.POSTGRES_PASSWORD || 'ferio';

    const tenantPool = new Pool({
      host: tenantHost,
      port: Number(tenantPort),
      database: dbName,
      user: tenantUser,
      password: tenantPassword,
      max: 2,
    });

    try {
      await tenantPool.query(`
        CREATE TABLE IF NOT EXISTS _ferio_tenant_migrations (
          name TEXT PRIMARY KEY,
          non_transactional BOOLEAN NOT NULL DEFAULT false,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      const existingRes = await tenantPool.query(
        'SELECT name FROM _ferio_tenant_migrations'
      );
      const appliedSet = new Set(existingRes.rows.map((r) => r.name));

      let newlyAppliedCount = 0;
      let lastApplied = tdb.schemaVersion;

      for (const mig of allMigrations) {
        if (appliedSet.has(mig)) continue;

        const sql = readFileSync(join(migrationsDir, mig, 'migration.sql'), 'utf8');
        const client = await tenantPool.connect();
        try {
          const nonTransactional = sql.startsWith('-- FERIO: NON_TRANSACTIONAL');
          if (!nonTransactional) await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO _ferio_tenant_migrations (name, non_transactional) VALUES ($1, $2)',
            [mig, nonTransactional]
          );
          if (!nonTransactional) await client.query('COMMIT');
          console.log(`  ✓ Applied: ${mig}`);
          newlyAppliedCount++;
          lastApplied = mig;
        } catch (migErr) {
          if (!sql.startsWith('-- FERIO: NON_TRANSACTIONAL')) {
            await client.query('ROLLBACK').catch(() => undefined);
          }
          console.error(`  ✗ Failed to apply ${mig} to ${dbName}:`, migErr.message);
          throw migErr;
        } finally {
          client.release();
        }
      }

      if (tdb.username) {
        await tenantPool.query(`
          GRANT ALL ON ALL TABLES IN SCHEMA public TO "${tdb.username}";
          GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${tdb.username}";
        `).catch((e) => console.warn(`  ! Note: could not grant to ${tdb.username}:`, e.message));
      }

      if (newlyAppliedCount > 0 && lastApplied) {
        await platformPool.query(
          `UPDATE "TenantDatabase" SET "schemaVersion" = $1, "updatedAt" = now() WHERE "id" = $2`,
          [lastApplied, tdb.id]
        );
        console.log(`[FleetMigrate] Updated ${dbName} schemaVersion to ${lastApplied}`);
      } else {
        console.log(`[FleetMigrate] ${dbName} is already up to date.`);
      }
    } catch (err) {
      console.error(`[FleetMigrate] Error migrating tenant DB ${dbName}:`, err.message);
    } finally {
      await tenantPool.end();
    }
  }

  await platformPool.end();
  console.log('[FleetMigrate] Fleet migration check completed.');
}

migrateFleet().catch((err) => {
  console.error('[FleetMigrate] Fatal error:', err);
  process.exit(1);
});
