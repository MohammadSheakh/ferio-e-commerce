import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CatalogService } from './catalog.service';
import {
  AdjustInventoryDto,
  AdminProductQueryDto,
  BrandQueryDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateProductDto,
  InventoryQueryDto,
  ProductQueryDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/catalog.dto';

@ApiTags('Catalog')
@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List active storefront categories' })
  getCategories() {
    return this.catalogService.getCategories(true);
  }

  @Get('brands')
  @ApiOperation({ summary: 'List active storefront brands' })
  getBrands(@Query() query: BrandQueryDto) {
    return this.catalogService.getBrands(query, true);
  }

  @Get('products')
  @ApiOperation({ summary: 'List published storefront products' })
  getProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.getProducts(query, true);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get one published storefront product' })
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getPublicProductBySlug(slug);
  }
}

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin/catalog')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.CATALOG_READ)
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  getCategories() {
    return this.catalogService.getCategories(false);
  }

  @Post('categories')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  createCategory(@Body() dto: CreateCategoryDto, @User() actor: UserPayload) {
    return this.catalogService.createCategory(dto, actor);
  }

  @Patch('categories/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @User() actor: UserPayload,
  ) {
    return this.catalogService.updateCategory(id, dto, actor);
  }

  @Delete('categories/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  deleteCategory(@Param('id') id: string, @User() actor: UserPayload) {
    return this.catalogService.deleteCategory(id, actor);
  }

  @Get('brands')
  getBrands(@Query() query: BrandQueryDto) {
    return this.catalogService.getBrands(query, false);
  }

  @Post('brands')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  createBrand(@Body() dto: CreateBrandDto, @User() actor: UserPayload) {
    return this.catalogService.createBrand(dto, actor);
  }

  @Patch('brands/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @User() actor: UserPayload,
  ) {
    return this.catalogService.updateBrand(id, dto, actor);
  }

  @Delete('brands/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  deleteBrand(@Param('id') id: string, @User() actor: UserPayload) {
    return this.catalogService.deleteBrand(id, actor);
  }

  @Get('products')
  getProducts(@Query() query: AdminProductQueryDto) {
    return this.catalogService.getProducts(query, false);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.catalogService.getAdminProductById(id);
  }

  @Post('products')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  createProduct(@Body() dto: CreateProductDto, @User() actor: UserPayload) {
    return this.catalogService.createProduct(dto, actor);
  }

  @Patch('products/:id')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @User() actor: UserPayload,
  ) {
    return this.catalogService.updateProduct(id, dto, actor);
  }

  @Patch('products/:id/status')
  @Permissions(PERMISSIONS.CATALOG_MANAGE)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
    @User() actor: UserPayload,
  ) {
    return this.catalogService.updateProductStatus(id, dto, actor);
  }

  @Patch('inventory/:variantId')
  @Permissions(PERMISSIONS.INVENTORY_ADJUST)
  adjustInventory(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustInventoryDto,
    @User() actor: UserPayload,
  ) {
    return this.catalogService.adjustInventory(variantId, dto, actor);
  }

  @Get('inventory')
  getInventory(@Query() query: InventoryQueryDto) {
    return this.catalogService.getInventory(query);
  }

  @Get('inventory/:variantId/movements')
  getInventoryMovements(
    @Param('variantId') variantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getInventoryMovements(
      variantId,
      Number(limit) || 30,
    );
  }
}
