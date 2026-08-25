import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PlatformPrismaService } from '../platform-prisma.service';
import type { Pool } from 'pg';
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
  constructor(platform: PlatformPrismaService) {
    super();
    void platform;
  }

  async createTenantDatabase(params: {
    organizationId: string;
    slug: string;
  }): Promise<CreatedTenantDatabase> {
    const url = process.env.PLATFORM_DATABASE_URL;
    if (!url) throw new Error('PLATFORM_DATABASE_URL_MISSING');
    const parsed = new URL(url);
    const dbName = `ferio_tenant_${params.slug.replace(/-/g, '_')}_${randomBytes(2)
      .toString('hex')}`;
    const dbPassword = randomBytes(18).toString('base64url');
    const roleName = `tenant_${params.organizationId.slice(-8)}`;

    const adminUrl = new URL(url);
    adminUrl.pathname = '/postgres';
    const { Pool } = require('pg') as typeof import('pg');
    const pool: Pool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    try {
      const quotedName = `"${dbName.replace(/"/g, '')}"`;
      await pool.query(`CREATE DATABASE ${quotedName}`);
      await pool
        .query(
          `CREATE ROLE "${roleName}" LOGIN PASSWORD '${dbPassword.replace(/'/g, "''")}'`,
        )
        .catch(async () => {
          // Role may already exist from a prior partial run — grant instead.
          await pool.query(
            `GRANT ALL PRIVILEGES ON DATABASE ${quotedName} TO "${roleName}"`,
          );
        });
      await pool.query(
        `GRANT ALL PRIVILEGES ON DATABASE ${quotedName} TO "${roleName}"`,
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
