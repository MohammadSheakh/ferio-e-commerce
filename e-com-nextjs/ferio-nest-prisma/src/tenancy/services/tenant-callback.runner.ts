import { Injectable, NotFoundException } from '@nestjs/common';
import { getCorrelationId } from '@app/common';
import { PlatformPrismaService } from '../../platform/platform-prisma.service';
import { TenantDatabaseManager } from './tenant-database.manager';
import {
  getTenantContext,
  runWithTenantContext,
} from '../context/tenant-context';

/**
 * Executes callbacks/workers against a specific organization's tenant
 * database (MT-7 §10.6). The organizationId must come from a TRUSTED source
 * — e.g. an HMAC-verified callback token (callback-tenant.util) or a
 * control-plane job envelope (MT-8) — never raw browser input.
 */
@Injectable()
export class TenantCallbackRunner {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly manager: TenantDatabaseManager,
  ) {}

  async runForOrganization<T>(
    organizationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const registry = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
      include: { organization: { select: { status: true } } },
    });
    if (
      !registry ||
      registry.status !== 'READY' ||
      registry.organization.status !== 'ACTIVE'
    ) {
      throw new NotFoundException('TENANT_DATABASE_NOT_READY');
    }

    const client = await this.manager.getClient({
      id: registry.id,
      host: registry.host,
      port: registry.port,
      databaseName: registry.databaseName,
      username: registry.username,
      credentialCipher: registry.credentialCipher,
    });
    void client; // warm the pool; services resolve via context below

    return runWithTenantContext(
      {
        correlationId: getCorrelationId(),
        organizationId,
        tenantDatabaseId: registry.id,
        database: {
          id: registry.id,
          host: registry.host,
          port: registry.port,
          databaseName: registry.databaseName,
          username: registry.username,
          credentialCipher: registry.credentialCipher,
        },
        domainId: 'callback-binding',
        hostname: 'payment-callback',
        subscriptionStatus: 'ACTIVE',
      },
      fn,
    );
  }

  /** Introspection helper for handlers that need the warmed client directly. */
  client(): ReturnType<typeof getTenantContext>['database'] {
    return getTenantContext().database;
  }
}
