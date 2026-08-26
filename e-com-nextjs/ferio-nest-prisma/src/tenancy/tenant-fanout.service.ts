import { Injectable } from '@nestjs/common';
import { StructuredLogger, TenantMetrics } from '@app/common';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { runWithTenantContext, type TenantContext } from './tenant-context';
import { TenantDatabaseManager } from './tenant-database.manager';

export interface FanoutOutcome<T> {
  processed: number;
  results: T[];
  failures: Array<{ organizationId: string; error: string }>;
}

/**
 * Multi-tenant worker fan-out (MT-8 §11.2).
 *
 * Background sweeps (message dispatch, payment expiry, courier polling,
 * reconciliation) must execute once PER ready tenant instead of against the
 * legacy database. This runner:
 *  - enumerates ACTIVE organizations with READY tenant databases;
 *  - resolves each tenant client through the bounded manager (ADR-0003);
 *  - runs the handler inside that tenant's immutable context;
 *  - isolates failures: one broken tenant is recorded and skipped — it can
 *    never starve another tenant's jobs or crash the sweep.
 *
 * Legacy mode (`TENANCY_ENABLED=false`): runs the handler exactly once
 * without a tenant context, preserving current behavior.
 */
@Injectable()
export class TenantFanoutService {
  private readonly logger = new StructuredLogger(TenantFanoutService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly manager: TenantDatabaseManager,
  ) {}

  /** Execute fn for every ready tenant; legacy single-run when tenancy off. */
  async forEachTenant(
    fn: () => Promise<void>,
    options: { label: string },
  ): Promise<FanoutOutcome<void>> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      await fn();
      return { processed: 1, results: [], failures: [] };
    }

    const outcome: FanoutOutcome<void> = { processed: 0, results: [], failures: [] };

    let cursor: string | undefined;
    do {
      const registries = await this.readyTenantPage(cursor);
      if (registries.length === 0) break;

      // Bounded workers prevent one slow tenant from serializing the fleet
      // without opening a pool for every tenant at once.
      let nextIndex = 0;
      const worker = async () => {
        while (nextIndex < registries.length) {
          const registry = registries[nextIndex];
          nextIndex += 1;
          try {
            await this.manager.runTransient(registry, () =>
              runWithTenantContext(this.contextFor(registry), fn),
            );
            outcome.processed += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            outcome.failures.push({ organizationId: registry.organizationId, error: message });
            TenantMetrics.increment('queue_tenant_failure', {
              label: options.label ?? 'unlabeled',
              organizationId: registry.organizationId,
            });
            this.logger.error('tenant_fanout_failure', error instanceof Error ? error : new Error(message), {
              label: options.label,
              organizationId: registry.organizationId,
            });
          }
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(this.concurrency(), registries.length) },
          () => worker(),
        ),
      );
      cursor = registries.at(-1)?.id;
      if (registries.length < this.pageSize()) break;
    } while (cursor);
    return outcome;
  }

  /** Run fn inside one specific organization's context (trusted callers only). */
  async forOrganization<T>(
    organizationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const registry = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
    });
    if (!registry || registry.status !== 'READY') {
      throw new Error(`TENANT_DATABASE_NOT_READY:${organizationId}`);
    }
    await this.manager.getClient(registry);
    return runWithTenantContext(this.contextFor(registry as never), fn);
  }

  private contextFor(registry: {
    id: string;
    organizationId: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    credentialCipher: string;
  }): TenantContext {
    return Object.freeze({
      organizationId: registry.organizationId,
      tenantDatabaseId: registry.id,
      database: Object.freeze({
        id: registry.id,
        host: registry.host,
        port: registry.port,
        databaseName: registry.databaseName,
        username: registry.username,
        credentialCipher: registry.credentialCipher,
      }),
      domainId: 'worker-fanout',
      hostname: 'background-worker',
      subscriptionStatus: 'ACTIVE' as const,
    });
  }

  private readyTenantPage(cursor?: string) {
    return this.platform.client.tenantDatabase.findMany({
      where: {
        status: 'READY',
        organization: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        organizationId: true,
        host: true,
        port: true,
        databaseName: true,
        username: true,
        credentialCipher: true,
      },
      orderBy: { id: 'asc' },
      take: this.pageSize(),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  private pageSize(): number {
    const configured = Number(process.env.TENANT_FANOUT_PAGE_SIZE ?? 100);
    return Number.isSafeInteger(configured) && configured > 0
      ? Math.min(configured, 500)
      : 100;
  }

  private concurrency(): number {
    const configured = Number(process.env.TENANT_FANOUT_CONCURRENCY ?? 4);
    return Number.isSafeInteger(configured) && configured > 0
      ? Math.min(configured, 16)
      : 4;
  }
}
