import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { AuthModule } from '../authentication/auth.module';
import {
  AdminCatalogController,
  PublicCatalogController,
} from './catalog.controller';
import { CatalogService } from './catalog.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
