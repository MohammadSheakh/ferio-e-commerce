import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { QUEUE_NAMES } from '@app/queue';
import { PlatformPrismaService } from './platform-prisma.service';
import { TenancyModule } from '../tenancy/tenancy.module';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { TenantDatabasesService } from './services/tenant-databases.service';
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { EntitlementsService } from './services/entitlements.service';
import { USAGE_READER } from './services/entitlements.service';
import { UsageService } from './services/usage.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { SupportAccessService } from './services/support-access.service';
import { ProvisioningService } from './services/provisioning.service';
import { PlatformAdminController } from './platform.controller';
import { PlatformAuthService } from './services/platform-auth.service';
import { MigrationOrchestratorService } from './services/migration-orchestrator.service';
import { TenantMigrationProcessor } from './migration-orchestrator.processor';
import { TenantClosureService } from './services/tenant-closure.service';
import { PlanGateService } from './services/plan-gate.service';
import { PlatformBillingService } from './services/platform-billing.service';
import {
  LocalPostgresProvisioner,
} from './services/local-postgres-provisioner';
import {
  TenantDatabaseProvisioner,
} from './services/tenant-database-provisioner.interface';
import {
  PlatformBillingCallbackController,
  PlatformBillingController,
} from './platform-billing.controller';

/**
 * Ferio control plane (MT-1). Owns SaaS metadata exclusively and is fully
 * independent of tenant Prisma models: nothing here may import tenant data
 * services, keeping the platform operable even when every tenant DB is down.
 */
@Global()
@Module({
  imports: [
    TenancyModule,
    ThrottlerModule.forRoot({
      throttlers: [
        // Platform realm default: generous for operator workflows, but
        // every route is bounded. auth/login tightens itself via @Throttle.
        { name: 'platform', limit: 300, ttl: 60_000 },
      ],
    }),
    JwtModule.register({
      secret: process.env.PLATFORM_JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.TENANT_MIGRATION,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      },
    ),
  ],
  controllers: [PlatformAdminController, PlatformBillingController, PlatformBillingCallbackController],
  // Tenant migration queue processor registered below with providers.
  providers: [
    PlatformPrismaService,
    PlatformAuthService,
    MigrationOrchestratorService,
    TenantClosureService,
    PlanGateService,
    LocalPostgresProvisioner,
    PlatformBillingService,
    {
      provide: 'TENANT_DB_PROVISIONER',
      useExisting: LocalPostgresProvisioner,
    },
    {
      provide: 'ORG_MEMBERS_COUNTER',
      useFactory: (platform: PlatformPrismaService) => ({
        countActiveMembers: (organizationId: string) =>
          platform.client.organizationMember.count({
            where: { organizationId, isActive: true },
          }),
      }),
      inject: [PlatformPrismaService],
    },
    {
      provide: 'PLAN_GATE',
      useExisting: PlanGateService,
    },
    TenantMigrationProcessor,
    OrganizationsService,
    DomainsService,
    TenantDatabasesService,
    PlansService,
    SubscriptionsService,
    EntitlementsService,
    {
      provide: USAGE_READER,
      useExisting: UsageService,
    },
    UsageService,
    PlatformAuditService,
    SupportAccessService,
    ProvisioningService,
  ],
  exports: [
    PlatformPrismaService,
    OrganizationsService,
    DomainsService,
    TenantDatabasesService,
    PlansService,
    SubscriptionsService,
    EntitlementsService,
    UsageService,
    PlatformAuditService,
    SupportAccessService,
    ProvisioningService,
    TenantClosureService,
    PlanGateService,
    LocalPostgresProvisioner,
    PlatformBillingService,
    {
      provide: 'TENANT_DB_PROVISIONER',
      useExisting: LocalPostgresProvisioner,
    },
    {
      provide: 'ORG_MEMBERS_COUNTER',
      useFactory: (platform: PlatformPrismaService) => ({
        countActiveMembers: (organizationId: string) =>
          platform.client.organizationMember.count({
            where: { organizationId, isActive: true },
          }),
      }),
      inject: [PlatformPrismaService],
    },
    {
      provide: 'PLAN_GATE',
      useExisting: PlanGateService,
    },
  ],
})
export class PlatformModule {}
