import { Module } from '@nestjs/common';
import { AuthModule } from '../authentication/auth.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { R2Strategy } from './r2.strategy';
import { StorageController } from './storage.controller';

/**
 * MT-10 storage surface (owner decision #6): Cloudflare R2 via the
 * S3-compatible API with tenant-namespaced private objects and presigned
 * access. Admin-only in Release 1; customer-facing surfaces adopt it when
 * media features ship.
 */
@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [StorageController],
  providers: [{ provide: 'STORAGE_STRATEGY', useClass: R2Strategy }],
  exports: ['STORAGE_STRATEGY'],
})
export class StorageModule {}
