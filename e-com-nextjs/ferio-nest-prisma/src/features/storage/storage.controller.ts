import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, PermissionsGuard, Roles, RolesGuard } from '@app/common';
import { TenantMembershipGuard } from '../../tenancy/guards/tenant-membership.guard';
import { assertTenantObjectKey } from '../../tenancy/utils/object-keys.util';
import type { StorageStrategy } from './strategies/r2.strategy';
import { FinalizePutDto, PresignPutDto } from './storage.dto';

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
  constructor(
    @Inject('STORAGE_STRATEGY') private readonly strategy: StorageStrategy,
  ) {}

  @Get('presign-get')
  async presignGet(@Body() body: { key: string }) {
    assertTenantObjectKey(body.key);
    return { url: await this.strategy.getSignedUrl(body.key), key: body.key };
  }

  @Post('presign-put')
  async presignPut(@Body() body: PresignPutDto) {
    // The strategy builds the server-side tenant-scoped key; clients cannot
    // rename paths or escape their own prefix.
    return this.strategy.presignPut(
      body.folder ?? 'misc',
      body.filename ?? 'upload.bin',
      body.contentType ?? 'application/octet-stream',
      body.sizeBytes,
    );
  }

  @Post('finalize-put')
  async finalizePut(@Body() body: FinalizePutDto) {
    assertTenantObjectKey(body.key);
    return this.strategy.inspectUploadedObject(
      body.key,
      body.contentType,
      body.sizeBytes,
    );
  }
}
