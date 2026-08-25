import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { StructuredLogger } from '@app/common';

export interface BootstrapResult {
  applied: string[];
  schemaVersion: string;
}

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
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
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
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO _ferio_tenant_migrations (name) VALUES ($1)', [name]);
          await client.query('COMMIT');
          applied.push(name);
        } catch (error) {
          await client.query('ROLLBACK').catch(() => undefined);
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
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      password: connection.password,
      max: 1,
    });
    try {
      // Store identity defaults to the tenant's own name; support channels
      // intentionally empty until configured by the owner.
      await pool.query(
        `INSERT INTO "CommerceSettings" ("id", "storeName", "createdAt", "updatedAt")
         VALUES ('default', $1, now(), now())
         ON CONFLICT ("id") DO NOTHING`,
        [connection.organizationName ?? 'My Store'],
      );
      // COD verification starts at its safest mode.
      await pool.query(
        `INSERT INTO "CodVerificationPolicy" ("id", "mode", "createdAt", "updatedAt")
         VALUES ('default', 'ALWAYS', now(), now())
         ON CONFLICT ("id") DO NOTHING`,
      );
    } finally {
      await pool.end().catch(() => undefined);
    }
  }
}
