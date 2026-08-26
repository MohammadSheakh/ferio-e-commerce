import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  PermissionsGuard,
  Roles,
  RolesGuard,
  type UserPayload,
} from '@app/common';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import { tryGetTenantContext } from '../../tenancy/tenant-context';
import type { StorageStrategy } from './r2.strategy';


/**
 * MT-10 storage surface (owner decision #6): presigned direct-to-bucket
 * uploads/downloads for admin surfaces (brand logos, product media,
 * evidence files) against the tenant-namespaced private bucket.
 *
 * Isolation: every key is validated to live inside the caller's own
 * `tenants/{organizationId}/…` namespace — the organization comes from the
 * ambient server-side context and is never accepted from the client.
 */
@Controller('admin/storage')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
export class StorageController {
  constructor(@Inject('STORAGE_STRATEGY') private readonly strategy: StorageStrategy) {}

  private assertOwnNamespace(key: string): void {
    const context = tryGetTenantContext();
    if (!context) return; // legacy mode: no org namespaces exist
    const required = `tenants/${context.organizationId}/`;
    if (!key.startsWith(required)) {
      throw new Error(`STORAGE_KEY_FORBIDDEN:key must start with ${required}`);
    }
  }

  @Get('presign-get')
  async presignGet(@Body() body: { key: string }) {
    this.assertOwnNamespace(body.key);
    return { url: await this.strategy.getSignedUrl(body.key), key: body.key };
  }

  @Post('presign-put')
  async presignPut(
    @Body()
    body: { folder: string; filename: string; contentType: string },
  ) {
    // The strategy builds the server-side tenant-scoped key; clients cannot
    // rename paths or escape their own prefix.
    return this.strategy.presignPut(
      body.folder ?? 'misc',
      body.filename ?? 'upload.bin',
      body.contentType ?? 'application/octet-stream',
    );
  }
}
