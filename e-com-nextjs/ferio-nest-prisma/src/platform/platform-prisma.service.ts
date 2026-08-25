import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated/platform-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { StructuredLogger } from '@app/common';

/**
 * Control-plane database client. Connects ONLY to PLATFORM_DATABASE_URL and
 * only ever touches SaaS metadata (organizations, domains, plans, billing…).
 * Tenant commerce data is never read or written through this service.
 */
@Injectable()
export class PlatformPrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;
  private readonly logger = new StructuredLogger(PlatformPrismaService.name);

  constructor() {
    const url = process.env.PLATFORM_DATABASE_URL;
    if (!url) {
      throw new Error(
        'PLATFORM_DATABASE_URL is required: the control plane cannot share the legacy single-tenant DATABASE_URL.',
      );
    }
    const pool = new Pool({ connectionString: url, max: 5 });
    this.client = new PrismaClient({ adapter: new PrismaPg(pool) });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.log('platform_database_connection_established', {});
    } catch (error) {
      this.logger.error('platform_database_connection_failed', error, {});
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect().catch(() => undefined);
  }
}
