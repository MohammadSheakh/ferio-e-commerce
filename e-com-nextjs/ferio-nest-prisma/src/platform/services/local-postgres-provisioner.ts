import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';
import {
  TenantDatabaseProvisioner,
  type CreatedTenantDatabase,
} from './tenant-database-provisioner.interface';

/**
 * Default executor: provisions each tenant database on the same managed
 * PostgreSQL server as the control plane. Sufficient for internal alpha and
 * pilots; replaced wholesale by a ManagedPostgresProvisioner when the
 * production hosting decision lands (PO-009/PO-022) without touching the
 * orchestration state machine.
 */
@Injectable()
export class LocalPostgresProvisioner extends TenantDatabaseProvisioner {
  async createTenantDatabase(params: {
    organizationId: string;
    slug: string;
  }): Promise<CreatedTenantDatabase> {
    const url = process.env.PLATFORM_DATABASE_URL;
    if (!url) throw new Error('PLATFORM_DATABASE_URL_MISSING');
    const parsed = new URL(url);
    const dbName = `ferio_tenant_${params.slug.replace(/-/g, '_')}_${randomBytes(
      2,
    ).toString('hex')}`;
    const dbPassword = randomBytes(18).toString('base64url');
    const roleName = `tenant_${params.organizationId.slice(-8)}`;

    const adminUrl = new URL(url);
    adminUrl.pathname = '/postgres';
    const pool: Pool = new Pool({
      connectionString: adminUrl.toString(),
      max: 1,
    });
    try {
      const quotedName = quoteIdentifier(dbName);
      const quotedRole = quoteIdentifier(roleName);
      const passwordLiteral = quoteLiteral(dbPassword);
      await pool.query(`CREATE DATABASE ${quotedName}`);
      try {
        await pool.query(
          `CREATE ROLE ${quotedRole} LOGIN PASSWORD ${passwordLiteral}`,
        );
      } catch (error: unknown) {
        if (!isDuplicateObjectError(error)) throw error;
        // A prior partial run may have created the role. Reconcile its
        // password instead of returning credentials that do not work.
      }
      await pool.query(`ALTER ROLE ${quotedRole} PASSWORD ${passwordLiteral}`);
      await pool.query(
        `GRANT ALL PRIVILEGES ON DATABASE ${quotedName} TO ${quotedRole}`,
      );
    } finally {
      await pool.end().catch(() => undefined);
    }

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      databaseName: dbName,
      username: roleName,
      password: dbPassword,
    };
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function isDuplicateObjectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42710'
  );
}
