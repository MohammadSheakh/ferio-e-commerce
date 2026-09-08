import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  PLATFORM_PERMISSION,
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { DomainsService } from './services/domains.service';
import { AddCustomDomainDto, VerifyCustomDomainDto } from './dto/domain.dto';

/** Platform operator routes for the audited tenant-domain lifecycle. */
@Controller('platform/organizations')
@UseGuards(ThrottlerGuard, PlatformAuthGuard)
@Throttle({ platform: { limit: 300, ttl: 60_000 } })
export class PlatformDomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Post(':organizationId/domains/custom')
  @PlatformPermissions(PLATFORM_PERMISSION.DOMAIN_WRITE)
  addCustomDomain(
    @Param('organizationId') organizationId: string,
    @Body() body: AddCustomDomainDto,
  ) {
    return this.domains.addCustomDomain(organizationId, body.hostname);
  }

  @Post(':organizationId/domains/:domainId/verify')
  @PlatformPermissions(PLATFORM_PERMISSION.DOMAIN_WRITE)
  verifyCustomDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
    @Body() body: VerifyCustomDomainDto,
  ) {
    return this.domains.verifyOwnership(
      domainId,
      body.verificationToken,
      organizationId,
    );
  }

  @Post(':organizationId/domains/:domainId/primary')
  @PlatformPermissions(PLATFORM_PERMISSION.DOMAIN_WRITE)
  setPrimary(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domains.setPrimary(organizationId, domainId);
  }

  @Post(':organizationId/domains/:domainId/disable')
  @PlatformPermissions(PLATFORM_PERMISSION.DOMAIN_WRITE)
  disable(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domains.disable(domainId, undefined, organizationId);
  }
}
