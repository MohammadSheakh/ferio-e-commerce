import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from '../services/storefront.service';
import { CollectionQueryDto } from '../dto/storefront.dto';

@ApiTags('Storefront (Public)')
@Controller('storefront')
export class PublicStorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get published storefront page configuration with hydrated sections' })
  async getPage(
    @Param('slug') slug: string,
    @Query('preview') preview?: string,
  ) {
    if (preview === 'true') {
      return this.storefrontService.getDraftPage(slug || 'home');
    }
    return this.storefrontService.getPublishedPage(slug || 'home');
  }

  @Get('collections')
  @ApiOperation({ summary: 'List published collections' })
  async getCollections(@Query() query: CollectionQueryDto) {
    return this.storefrontService.getCollections(query);
  }

  @Get('collections/by-slug/:slug')
  @ApiOperation({ summary: 'Get collection details by slug with active products' })
  async getCollectionBySlug(@Param('slug') slug: string) {
    return this.storefrontService.getCollectionBySlug(slug);
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Get collection details' })
  async getCollectionById(@Param('id') id: string) {
    return this.storefrontService.getCollectionById(id);
  }
}

