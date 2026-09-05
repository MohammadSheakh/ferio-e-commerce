import { Module } from '@nestjs/common';
import { RedisModule, RedisService } from '@app/redis';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import {
  RetentionQueue,
  RETENTION_SWEEP_JOB,
} from './retention.queue';
import { RetentionProcessor } from './retention.processor';
import { RetentionSweepService } from './retention-sweep.service';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { TenancyController } from './tenancy.controller';
import { TenancyPlanController } from './tenancy-plan.controller';
import { TenantResolverService, TenantContextMiddleware } from './tenant-resolver.service';
import { TenantDatabaseManager } from './tenant-database.manager';
import { TenantDbService } from './tenant-db.service';
import { TenantSchemaBootstrapper } from './tenant-schema.bootstrapper';
import {
  TenantMembershipGuard,
  TenantMembershipService,
} from './tenant-membership.guard';
import { TenantCallbackRunner } from './tenant-callback.runner';
import { TenantFanoutService } from './tenant-fanout.service';
import { TenancyObservabilityService } from './tenancy-observability.service';
import { UsageReconciliationService } from './usage-reconciliation.service';
import { TenantReturnOriginService } from './tenant-return-origin.service';

/**
 * Tenant plane (MT-2/MT-3): trusted resolution, immutable request context,
 * and bounded tenant database connection management. Depends only on the
 * control-plane module — never on tenant commerce services.
 */
@Module({
  imports: [
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET as string,
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
      useFactory: async (platform: PlatformPrismaService, redis: RedisService) => {
        const service = new TenantMembershipService(platform.client, redis);
        await service.initCrossInstanceInvalidation();
        return service;
      },
      inject: [PlatformPrismaService, RedisService],
    },
    TenantMembershipGuard,
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
