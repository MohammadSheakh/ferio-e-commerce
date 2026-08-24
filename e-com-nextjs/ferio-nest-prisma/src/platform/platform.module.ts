import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PlatformPrismaService } from './platform-prisma.service';
import { OrganizationsService } from './services/organizations.service';
import { DomainsService } from './services/domains.service';
import { TenantDatabasesService } from './services/tenant-databases.service';
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { EntitlementsService } from './services/entitlements.service';
import { UsageService } from './services/usage.service';
import { PlatformAuditService } from './services/platform-audit.service';
import { SupportAccessService } from './services/support-access.service';
import { ProvisioningService } from './services/provisioning.service';
import { PlatformAdminController } from './platform.controller';

/**
 * Ferio control plane (MT-1). Owns SaaS metadata exclusively and is fully
 * independent of tenant Prisma models: nothing here may import tenant data
 * services, keeping the platform operable even when every tenant DB is down.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.PLATFORM_JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [PlatformAdminController],
  providers: [
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
  ],
})
export class PlatformModule {}
