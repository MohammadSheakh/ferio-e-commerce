import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule, RedisService } from '@app/redis';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { RetentionQueue } from './queues/retention.queue';
import { RetentionProcessor } from './processors/retention.processor';
import { RetentionSweepService } from './services/retention-sweep.service';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { TenancyController } from './controllers/tenancy.controller';
import { TenancyPlanController } from './controllers/tenancy-plan.controller';
import {
  TenantResolverService,
  TenantContextMiddleware,
} from './services/tenant-resolver.service';
import { TenantDatabaseManager } from './services/tenant-database.manager';
import { TenantDbService } from './services/tenant-db.service';
import { TenantSchemaBootstrapper } from './services/tenant-schema.bootstrapper';
import {
  TenantMembershipGuard,
  TenantMembershipService,
} from './guards/tenant-membership.guard';
import { TenantCallbackRunner } from './services/tenant-callback.runner';
import { TenantFanoutService } from './services/tenant-fanout.service';
import { TenancyObservabilityService } from './services/tenancy-observability.service';
import { UsageReconciliationService } from './services/usage-reconciliation.service';
import { TenantReturnOriginService } from './services/tenant-return-origin.service';
import { TenantSuspensionGuard } from './guards/tenant-suspension.guard';

/**
 * Tenant plane (MT-2/MT-3): trusted resolution, immutable request context,
 * and bounded tenant database connection management. Depends only on the
 * control-plane module — never on tenant commerce services.
 */
@Global()
@Module({
  imports: [
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? '',
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.RETENTION,
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  controllers: [TenancyController, TenancyPlanController],
  providers: [
    TenantResolverService,
    {
      provide: TenantMembershipService,
      useFactory: async (
        platform: PlatformPrismaService,
        redis: RedisService,
      ) => {
        const service = new TenantMembershipService(platform.client, redis);
        await service.initCrossInstanceInvalidation();
        return service;
      },
      inject: [PlatformPrismaService, RedisService],
    },
    TenantMembershipGuard,
    {
      provide: APP_GUARD,
      useClass: TenantSuspensionGuard,
    },
    TenantContextMiddleware,
    TenantDatabaseManager,
    TenantDbService,
    TenantSchemaBootstrapper,
    TenantCallbackRunner,
    TenantFanoutService,
    TenancyObservabilityService,
    UsageReconciliationService,
    RetentionSweepService,
    RetentionQueue,
    RetentionProcessor,
    TenantReturnOriginService,
  ],
  exports: [
    TenantResolverService,
    TenantDatabaseManager,
    TenantDbService,
    TenantSchemaBootstrapper,
    TenantCallbackRunner,
    TenantFanoutService,
    TenantMembershipGuard,
    TenantMembershipService,
    UsageReconciliationService,
    RetentionSweepService,
    TenantReturnOriginService,
  ],
})
export class TenancyModule {}
