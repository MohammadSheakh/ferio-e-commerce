import type { PlatformPrismaService } from '../platform-prisma.service';

export interface CreateTenantDatabaseParams {
  organizationId: string;
  slug: string;
}

export interface CreatedTenantDatabase {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
}

/**
 * Physical tenant-database creation boundary (PO-022 / ADR-0001).
 *
 * The provisioning state machine depends on THIS interface only. Today's
 * implementation issues CREATE DATABASE on the platform PostgreSQL server;
 * swapping to a managed provider (RDS/Neon/supabase API) is a configuration
 * change that replaces this class — no orchestration logic changes.
 */
export abstract class TenantDatabaseProvisioner {
  abstract createTenantDatabase(
    params: CreateTenantDatabaseParams,
  ): Promise<CreatedTenantDatabase>;
}
