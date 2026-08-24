import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { getTenantContext, tryGetTenantContext } from './tenant-context';
import type { TenantDatabaseManager } from './tenant-database.manager';

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

  metrics() {
    return this.manager.metrics();
  }
}
