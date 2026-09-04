import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import { TenantResolverService } from './tenant-resolver.service';

export interface TenancyStatusPayload {
  /** LEGACY = tenancy disabled; ACTIVE = resolved store; otherwise a stable
   * tenant error code the storefront maps to a full-page state. */
  code:
    | 'LEGACY'
    | 'ACTIVE'
    | 'TENANT_RESOLUTION_FAILED'
    | 'TENANT_SUSPENDED'
    | 'TENANT_UNAVAILABLE'
    | 'TENANT_MIGRATION_REQUIRED';
  /** Business-facing display name from control-plane metadata. Tenant-local
   * store settings take over once MT-7 routes settings reads per tenant. */
  storeName?: string;
}

/**
 * Public tenancy status for the requesting host (MT-5). Storefront server
 * components call this to choose between rendering a store or a full-page
 * unknown/suspended/unavailable state. Returns only safe metadata — never
 * registry IDs, hosts beyond the caller's own, or credentials.
 */
@ApiTags('Tenancy')
@Controller('tenancy')
export class TenancyController {
  constructor(
    private readonly resolver: TenantResolverService,
    private readonly platform: PlatformPrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Resolve the storefront state for this host' })
  async status(@Req() request: Request): Promise<TenancyStatusPayload> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      return { code: 'LEGACY' };
    }

    const effectiveHost = this.resolver.effectiveHostFrom({
      headers: request.headers as Record<string, string | string[] | undefined>,
      hostname: request.hostname,
      remoteAddress: request.socket?.remoteAddress,
    });

    try {
      const resolved = await this.resolver.resolveFromHost(effectiveHost);
      let storeName: string | undefined;
      try {
        const organization = await this.platform.client.organization.findUnique(
          {
            where: { id: resolved.organizationId },
            select: { name: true },
          },
        );
        storeName = organization?.name;
      } catch {
        // Branding is cosmetic; state mapping must not depend on it.
      }
      return { code: 'ACTIVE', storeName };
    } catch (error: unknown) {
      // Map resolver failures to stable codes with their intended status.
      const response =
        typeof error === 'object' && error !== null && 'response' in error
          ? error.response
          : undefined;
      const code =
        typeof response === 'object' && response !== null && 'code' in response
          ? response.code
          : undefined;
      if (
        code === 'TENANT_SUSPENDED' ||
        code === 'TENANT_UNAVAILABLE' ||
        code === 'TENANT_MIGRATION_REQUIRED' ||
        code === 'TENANT_RESOLUTION_FAILED'
      ) {
        return { code };
      }
      throw error;
    }
  }
}
