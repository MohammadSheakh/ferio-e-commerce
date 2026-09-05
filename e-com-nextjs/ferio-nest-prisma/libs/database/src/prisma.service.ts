import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { StructuredLogger } from '@app/common';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new StructuredLogger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: boundedInt(process.env.DB_POOL_MAX, 10, 1, 100),
      idleTimeoutMillis: boundedInt(
        process.env.DB_POOL_IDLE_TIMEOUT_MS,
        30_000,
        1_000,
        300_000,
      ),
      connectionTimeoutMillis: boundedInt(
        process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
        5_000,
        250,
        60_000,
      ),
      maxUses: boundedInt(process.env.DB_POOL_MAX_USES, 0, 0, 1_000_000),
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('database_connection_established', {
        database: 'postgresql',
      });
    } catch (error) {
      this.logger.error('database_connection_failed', error, {
        database: 'postgresql',
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined);
    await this.pool.end().catch(() => undefined);
  }

  get poolMetrics() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      max: this.pool.options.max,
    };
  }
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed >= minimum
    ? Math.min(parsed, maximum)
    : fallback;
}
