import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { PublicStorefrontController } from './controllers/public-storefront.controller';
import { AdminStorefrontController } from './controllers/admin-storefront.controller';
import { StorefrontService } from './services/storefront.service';
import { StorefrontHydrationService } from './services/storefront-hydration.service';
import { CollectionRuleCompilerService } from './services/collection-rule-compiler.service';
import { StorefrontCacheInvalidationService } from './services/storefront-cache-invalidation.service';

@Module({
  imports: [PrismaModule, AuthModule, CatalogModule, TenancyModule],
  controllers: [PublicStorefrontController, AdminStorefrontController],
  providers: [
    StorefrontService,
    StorefrontHydrationService,
    CollectionRuleCompilerService,
    StorefrontCacheInvalidationService,
  ],
  exports: [StorefrontService, StorefrontHydrationService, StorefrontCacheInvalidationService],
})
export class StorefrontModule {}

