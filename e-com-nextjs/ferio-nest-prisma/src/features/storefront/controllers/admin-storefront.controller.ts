import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { TenantMembershipGuard } from '../../../tenancy/guards/tenant-membership.guard';
import { StorefrontService } from '../services/storefront.service';
import {
  CreateCollectionDto,
  PublishStorefrontDto,
  RollbackStorefrontDto,
  SaveDraftSectionsDto,
  UpdateCollectionDto,
  CollectionQueryDto,
} from '../dto/storefront.dto';

@ApiTags('Admin Storefront Studio')
@ApiBearerAuth()
@Controller('admin/storefront')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
export class AdminStorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  // ==========================================================================
  // STOREFRONT STUDIO (PAGES & SECTIONS)
  // ==========================================================================

  @Get('pages/:slug/draft')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Load page draft with sections for the visual studio' })
  async getDraft(@Param('slug') slug: string) {
    return this.storefrontService.getDraftPage(slug || 'home');
  }

  @Put('pages/:slug/draft')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Save updated section layout and settings to working draft' })
  async saveDraft(
    @Param('slug') slug: string,
    @Body() dto: SaveDraftSectionsDto,
  ) {
    return this.storefrontService.saveDraftSections(slug || 'home', dto);
  }

  @Post('pages/:slug/publish')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Atomically publish working draft to live storefront' })
  async publish(
    @Param('slug') slug: string,
    @Body() dto: PublishStorefrontDto,
    @User() actor: UserPayload,
  ) {
    return this.storefrontService.publishPage(slug || 'home', dto, actor);
  }

  @Post('pages/:slug/rollback')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Atomically rollback live storefront to a previous version' })
  async rollback(
    @Param('slug') slug: string,
    @Body() dto: RollbackStorefrontDto,
    @User() actor: UserPayload,
  ) {
    return this.storefrontService.rollbackPage(slug || 'home', dto.versionNumber, actor);
  }

  @Get('pages/:slug/history')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'List version history for a storefront page' })
  async getHistory(@Param('slug') slug: string) {
    return this.storefrontService.getPageHistory(slug || 'home');
  }

  // ==========================================================================
  // PRODUCT COLLECTIONS
  // ==========================================================================

  @Get('collections')
  @Permissions(PERMISSIONS.CATALOG_READ)
  @ApiOperation({ summary: 'List collections for merchant admin' })
  async getCollections(@Query() query: CollectionQueryDto) {
    return this.storefrontService.getCollections(query);
  }

  @Get('collections/:id')
  @Permissions(PERMISSIONS.CATALOG_READ)
  @ApiOperation({ summary: 'Get collection details with items & rules' })
  async getCollectionById(@Param('id') id: string) {
    return this.storefrontService.getCollectionById(id);
  }

  @Post('collections')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a new manual or automatic collection' })
  async createCollection(@Body() dto: CreateCollectionDto) {
    return this.storefrontService.createCollection(dto);
  }

  @Patch('collections/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Update collection details, items, or rules' })
  async updateCollection(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.storefrontService.updateCollection(id, dto);
  }

  @Delete('collections/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Delete a collection' })
  async deleteCollection(@Param('id') id: string) {
    return this.storefrontService.deleteCollection(id);
  }
}

