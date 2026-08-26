import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Control-plane Prisma config: separate schema, separate migrations
 * directory and the PLATFORM_DATABASE_URL datasource — the tenant chain in
 * prisma.config.ts never touches this database (ADR-0005).
 */
export default defineConfig({
  schema: 'platform.prisma',
  migrations: {
    path: 'platform-migrations',
  },
  datasource: {
    url: env('PLATFORM_DATABASE_URL'),
  },
});
