import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { getTenantContext, tryGetTenantContext } from './tenant-context';
import { TenantDatabaseManager } from './tenant-database.manager';

/**
 * Request-scoped access to the resolved tenant database (MT-3 §6.2).
 *
 * Tenant-scoped services migrate to this one call:
 *   const db = await this.tenantDb.get();
 *   return db.product.findMany({ ... });
 *
 * Rules enforced here:
 * - The client is resolved exclusively from the immutable request context and
 *   the control-plane registry — never from function arguments or request
 *   input (a caller passing an ID cannot select another tenant's database).
 * - Outside a tenant-resolved request this fails loud. Legacy-mode fallbacks
 *   must be explicit decisions at the call site, never hidden here.
 */
@Injectable()
export class TenantDbService {
  constructor(private readonly manager: TenantDatabaseManager) {}

  async get(): Promise<PrismaClient> {
    const context = getTenantContext();
    return this.manager.getClient(context.database);
  }

  /** For code that legitimately runs in both legacy and tenant modes during
   * the MT-7 migration window. Returns undefined outside tenant requests. */
  async tryGet(): Promise<PrismaClient | undefined> {
    const context = tryGetTenantContext();
    if (!context) return undefined;
    return this.manager.getClient(context.database);
  }

  /**
   * Resolve the tenant client, or deliberately use the legacy client only
   * when the process is running in legacy mode. Keeping this policy here
   * prevents feature services from silently bypassing tenant isolation.
   */
  async getOrLegacy(legacyClient: PrismaClient): Promise<PrismaClient> {
    const tenant = await this.tryGet();
    if (tenant) return tenant;
    if (process.env.TENANCY_ENABLED === 'true') {
      throw new ServiceUnavailableException('TENANT_IDENTITY_CONTEXT_REQUIRED');
    }
    return legacyClient;
  }

  metrics() {
    return this.manager.metrics();
  }
}
