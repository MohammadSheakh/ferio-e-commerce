import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { StructuredLogger } from '@app/common';

export interface BootstrapResult {
  applied: string[];
  schemaVersion: string;
}

/** Factory store name installed by migration 20260811103000_commerce_settings_foundation. */
const FACTORY_STORE_NAME = 'Ferio';

/**
 * Applies the canonical tenant migration set to a freshly created tenant
 * database (ADR-0005 §14.1 packaging; MT-4 provisioning step).
 *
 * - Reads ordered `prisma/migrations/<name>/migration.sql` artifacts.
 * - Tracks applied migrations in `_ferio_tenant_migrations` so re-runs are
 *   idempotent — provisioning retries can never double-apply.
 * - Each migration runs inside its own transaction: a failure aborts that
 *   migration only and names the artifact in the error.
 */
@Injectable()
export class TenantSchemaBootstrapper {
  private readonly logger = new StructuredLogger(TenantSchemaBootstrapper.name);
  private readonly migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  /** Owner decision #14: bounded locks/statements for every tenant migration. */
  private readonly lockTimeoutMs = Math.max(
    Number(process.env.TENANT_MIGRATION_LOCK_TIMEOUT_MS ?? 30_000),
    1000,
  );
  private readonly statementTimeoutMs = Math.max(
    Number(process.env.TENANT_MIGRATION_STATEMENT_TIMEOUT_MS ?? 120_000),
    1000,
  );

  /** Sorted canonical artifact list — pure for testability. */
  listMigrations(dir = this.migrationsDir): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => existsSync(join(dir, name, 'migration.sql')))
      .sort();
  }

  async bootstrap(connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }): Promise<BootstrapResult> {
    const pool = new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      password: connection.password,
      max: 2,
    });

    const applied: string[] = [];
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS _ferio_tenant_migrations (
          name TEXT PRIMARY KEY,
          non_transactional BOOLEAN NOT NULL DEFAULT false,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      // Ledger upgrade for databases created before this column existed.
      await pool.query(`ALTER TABLE _ferio_tenant_migrations ADD COLUMN IF NOT EXISTS non_transactional BOOLEAN NOT NULL DEFAULT false`);
      await pool.query(`
      `);

      const migrations = this.listMigrations();
      const existing = new Set(
        (
          await pool.query<{ name: string }>(
            'SELECT name FROM _ferio_tenant_migrations',
          )
        ).rows.map((row) => row.name),
      );

      for (const name of migrations) {
        if (existing.has(name)) continue;
        const sql = readFileSync(join(this.migrationsDir, name, 'migration.sql'), 'utf8');
        const client = await pool.connect();
        try {
          // Owner decision #14: bounded blast radius for every migration —
          // a runaway statement can neither hold locks indefinitely nor run
          // past its statement budget.
          await client.query(
            `SET LOCAL lock_timeout = '${this.lockTimeoutMs}ms'; SET LOCAL statement_timeout = '${this.statementTimeoutMs}ms';`,
          );
          // Migrations marked with `-- FERIO: NON_TRANSACTIONAL` (e.g.
          // CREATE INDEX CONCURRENTLY, which PostgreSQL forbids inside a
          // transaction) run outside BEGIN/COMMIT and are recorded
          // separately so a mid-file failure is visible in the ledger.
          const nonTransactional = sql.startsWith('-- FERIO: NON_TRANSACTIONAL');
          if (!nonTransactional) await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO _ferio_tenant_migrations (name, non_transactional) VALUES ($1, $2)',
            [name, nonTransactional],
          );
          if (!nonTransactional) await client.query('COMMIT');
          applied.push(name);
        } catch (error) {
          if (!sql.startsWith('-- FERIO: NON_TRANSACTIONAL')) {
            await client.query('ROLLBACK').catch(() => undefined);
          }
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`TENANT_MIGRATION_FAILED:${name}:${message.slice(0, 300)}`);
        } finally {
          client.release();
        }
      }

      const schemaVersion = migrations.at(-1) ?? 'empty';
      this.logger.log('tenant_schema_bootstrapped', {
        totalMigrations: migrations.length,
        newlyApplied: applied.length,
        schemaVersion,
      });
      return { applied, schemaVersion };
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  /**
   * Minimal idempotent baseline seed (checklist §7.2): safe defaults with
   * commerce-affecting features OFF until the owner configures them.
   * No fake customers/orders/payments are ever seeded (PRD rule).
   */
  async seedBaseline(connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    organizationName?: string;
  }): Promise<void> {
    const pool = new Pool({
      ...connection,
      max: 1,
    });
    try {
      // The explicit organization name wins over migration-chain defaults,
      // but a re-seed must never clobber an owner-customized store name —
      // the row is only renamed while it still carries the factory default.
      await pool.query(
        `INSERT INTO "CommerceSettings" ("id", "storeName", "createdAt", "updatedAt")
         VALUES ($1, $2, now(), now())
         ON CONFLICT ("id") DO UPDATE
         SET "storeName" = EXCLUDED."storeName", "updatedAt" = now()
         WHERE "CommerceSettings"."storeName" = $3`,
        ['default', connection.organizationName ?? 'My Store', FACTORY_STORE_NAME],
      );
      await pool.query(
        'INSERT INTO "CodVerificationPolicy" ("id", "mode", "createdAt", "updatedAt") VALUES ($1, $2, now(), now()) ON CONFLICT ("id") DO NOTHING',
        ['default', 'ALWAYS'],
      );
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
}
