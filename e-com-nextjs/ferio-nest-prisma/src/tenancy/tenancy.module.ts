import { Module } from '@nestjs/common';
import { RedisModule, RedisService } from '@app/redis';
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

/**
 * Tenant plane (MT-2/MT-3): trusted resolution, immutable request context,
 * and bounded tenant database connection management. Depends only on the
 * control-plane module — never on tenant commerce services.
 */
@Module({
  imports: [RedisModule],
  controllers: [TenancyController, TenancyPlanController],
  providers: [
    TenantResolverService,
    {
      provide: TenantMembershipService,
      useFactory: async (platform: PlatformPrismaService, redis: RedisService) => {
        const service = new TenantMembershipService(platform.client as never, redis);
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
  ],
  exports: [TenantResolverService, TenantDatabaseManager, TenantDbService, TenantSchemaBootstrapper, TenantCallbackRunner, TenantFanoutService, TenantMembershipGuard, UsageReconciliationService],
})
export class TenancyModule {}
