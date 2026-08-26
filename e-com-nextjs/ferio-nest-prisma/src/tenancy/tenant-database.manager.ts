import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { StructuredLogger, TenantMetrics } from '@app/common';
import { decryptSecret } from '../platform/utils/secret-box';

interface CacheEntry {
  client: PrismaClient;
  pool: Pool;
  lastUsedAt: number;
}

interface BreakerState {
  failures: number;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 30_000;

/**
 * Bounded tenant Prisma client manager (ADR-0003).
 *
 * - Clients are keyed by control-plane `TenantDatabase.id` — never by
 *   request-supplied connection strings.
 * - LRU-bounded cache with idle eviction keeps open pools a constant.
 * - Per-database circuit breaker fails fast when a tenant DB is down, and
 *   never reroutes to another tenant's database.
 */
@Injectable()
export class TenantDatabaseManager implements OnModuleDestroy {
  private readonly logger = new StructuredLogger(TenantDatabaseManager.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly creations = new Map<string, Promise<PrismaClient>>();
  private readonly breakers = new Map<string, BreakerState>();
  private readonly maxClients: number;
  private readonly idleTtlMs: number;
  private readonly evictionGraceMs: number;
  private reservedSlots = 0;
  private capacityQueue: Promise<void> = Promise.resolve();
  private shuttingDown = false;
  private sweepTimer: NodeJS.Timeout;

  constructor() {
    this.maxClients = Math.max(Number(process.env.TENANT_DB_MAX_CLIENTS ?? 25), 2);
    this.idleTtlMs = Number(process.env.TENANT_DB_IDLE_TTL_SECONDS ?? 300) * 1000;
    this.evictionGraceMs = Math.max(
      Number(process.env.TENANT_DB_EVICTION_GRACE_MS ?? this.idleTtlMs),
      0,
    );
    this.sweepTimer = setInterval(() => void this.evictIdle(), Math.min(this.idleTtlMs / 2, 60_000));
    // Never hold the process open for the sweeper.
    this.sweepTimer.unref?.();
  }

  /** Resolve (or create) the client for a registry row fetched from the control plane. */
  async getClient(material: {
    id: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    credentialCipher: string;
  }): Promise<PrismaClient> {
    if (this.shuttingDown) {
      throw new Error('TENANT_DATABASE_MANAGER_SHUTTING_DOWN');
    }
    this.assertBreakerClosed(material.id);

    const existing = this.cache.get(material.id);
    if (existing) {
      existing.lastUsedAt = Date.now();
      // Refresh LRU recency.
      this.cache.delete(material.id);
      this.cache.set(material.id, existing);
      return existing.client;
    }

    const pending = this.creations.get(material.id);
    if (pending) return pending;

    const creation = Promise.resolve().then(() => this.createClient(material));
    this.creations.set(material.id, creation);
    try {
      return await creation;
    } finally {
      if (this.creations.get(material.id) === creation) {
        this.creations.delete(material.id);
      }
    }
  }

  private async createClient(material: {
    id: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    credentialCipher: string;
  }): Promise<PrismaClient> {
    await this.reserveCapacity();

    let pool: Pool | undefined;
    try {
      const password = decryptSecret(
        material.credentialCipher,
        process.env.PLATFORM_DB_CREDENTIAL_KEY,
      );
      pool = new Pool({
        host: material.host,
        port: material.port,
        database: material.databaseName,
        user: material.username,
        password,
        // MT-13 connection budget: per-tenant pools must sum inside the
        // server's max_connections alongside control plane + workers.
        max: Math.max(Number(process.env.TENANT_DB_POOL_MAX ?? 3), 1),
        connectionTimeoutMillis: Number(process.env.TENANT_DB_ACQUIRE_TIMEOUT_MS ?? 5000),
      });
      const client = new PrismaClient({ adapter: new PrismaPg(pool) });
      await client.$connect();
      const entry = { client, pool, lastUsedAt: Date.now() };
      this.reservedSlots -= 1;
      this.cache.set(material.id, entry);
      this.recordSuccess(material.id);
      return client;
    } catch (error) {
      this.reservedSlots = Math.max(this.reservedSlots - 1, 0);
      this.recordFailure(material.id);
      // Ensure no half-built pool leaks on failure.
      await pool?.end().catch(() => undefined);
      throw error;
    }
  }

  async disconnect(tenantDatabaseId: string): Promise<void> {
    const entry = this.cache.get(tenantDatabaseId);
    if (!entry) return;
    this.cache.delete(tenantDatabaseId);
    await entry.client.$disconnect().catch(() => undefined);
    await entry.pool.end().catch(() => undefined);
  }

  metrics() {
    return {
      activeClients: this.cache.size,
      pendingClients: this.creations.size,
      maxClients: this.maxClients,
      openBreakers: [...this.breakers.entries()].filter(([, b]) => b.openedAt !== null).length,
    };
  }

  private async reserveCapacity(): Promise<void> {
    let release!: () => void;
    const previous = this.capacityQueue;
    this.capacityQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      while (this.cache.size + this.reservedSlots >= this.maxClients) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (!oldestKey) throw new Error('TENANT_DATABASE_CAPACITY_EXHAUSTED');
        const oldest = this.cache.get(oldestKey);
        if (
          oldest &&
          Date.now() - oldest.lastUsedAt < this.evictionGraceMs
        ) {
          throw new Error('TENANT_DATABASE_CAPACITY_EXHAUSTED');
        }
        // Never disconnect a recently acquired client that may still be in use.
        await this.disconnect(oldestKey);
      }
      this.reservedSlots += 1;
    } finally {
      release();
    }
  }

  private async evictIdle(): Promise<void> {
    const cutoff = Date.now() - this.idleTtlMs;
    for (const [id, entry] of this.cache) {
      if (entry.lastUsedAt < cutoff) {
        await this.disconnect(id);
      }
    }
  }

  private assertBreakerClosed(id: string): void {
    const breaker = this.breakers.get(id);
    if (!breaker?.openedAt) return;
    if (Date.now() - breaker.openedAt < BREAKER_COOLDOWN_MS) {
      throw new Error(`TENANT_DATABASE_UNHEALTHY:${id}`);
    }
    // Cooldown elapsed — allow a probe attempt.
    breaker.openedAt = null;
    breaker.failures = 0;
  }

  private recordFailure(id: string): void {
    const breaker = this.breakers.get(id) ?? { failures: 0, openedAt: null };
    breaker.failures += 1;
    TenantMetrics.increment('db_acquire_failure', { tenantDatabaseId: id });
    if (breaker.failures >= FAILURE_THRESHOLD) {
      breaker.openedAt = Date.now();
      TenantMetrics.increment('db_breaker_opened', { tenantDatabaseId: id });
      this.logger.warn('tenant_database_breaker_opened', {
        tenantDatabaseId: id,
      });
    }
    this.breakers.set(id, breaker);
  }

  private recordSuccess(id: string): void {
    this.breakers.set(id, { failures: 0, openedAt: null });
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    clearInterval(this.sweepTimer);
    await Promise.allSettled([...this.creations.values()]);
    await Promise.allSettled([...this.cache.keys()].map((id) => this.disconnect(id)));
  }
}
