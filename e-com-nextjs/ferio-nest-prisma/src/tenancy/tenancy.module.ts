import { Module } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { TenancyController } from './tenancy.controller';
import { TenantResolverService, TenantContextMiddleware } from './tenant-resolver.service';
import { TenantDatabaseManager } from './tenant-database.manager';
import { TenantDbService } from './tenant-db.service';
import { TenantSchemaBootstrapper } from './tenant-schema.bootstrapper';
import {
  TenantMembershipGuard,
  TenantMembershipService,
} from './tenant-membership.guard';
import { TenantCallbackRunner } from './tenant-callback.runner';

/**
 * Tenant plane (MT-2/MT-3): trusted resolution, immutable request context,
 * and bounded tenant database connection management. Depends only on the
 * control-plane module — never on tenant commerce services.
 */
@Module({
  imports: [RedisModule],
  controllers: [TenancyController],
  providers: [
    TenantResolverService,
    TenantMembershipService,
    TenantMembershipGuard,
    TenantContextMiddleware,
    TenantDatabaseManager,
    TenantDbService,
    TenantSchemaBootstrapper,
    TenantCallbackRunner,
  ],
  exports: [TenantResolverService, TenantDatabaseManager, TenantDbService, TenantSchemaBootstrapper, TenantMembershipGuard],
})
export class TenancyModule {}
