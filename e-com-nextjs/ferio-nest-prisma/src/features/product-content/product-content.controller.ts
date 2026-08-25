import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import { ProductContentService } from './product-content.service';
import {
  CreateReviewBannerDto,
  ModerateYoutubeReviewDto,
  SubmitYoutubeReviewDto,
  UpdateReviewBannerDto,
} from './product-content.dto';

@Controller('product-content')
export class ProductContentController {
  constructor(private readonly service: ProductContentService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.publicProduct(slug);
  }

  @Post(':productId/reviews')
  @UseGuards(AuthGuard)
  submit(
    @Param('productId') id: string,
    @Body() dto: SubmitYoutubeReviewDto,
    @User() user: UserPayload,
  ) {
    return this.service.submit(id, dto, user);
  }
}

@Controller('admin/product-content')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.PRODUCT_CONTENT_READ)
export class AdminProductContentController {
  constructor(private readonly service: ProductContentService) {}

  @Get('reviews')
  reviews() {
    return this.service.adminReviews();
  }

  @Patch('reviews/:id')
  @Permissions(PERMISSIONS.PRODUCT_CONTENT_MANAGE)
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateYoutubeReviewDto,
    @User() user: UserPayload,
  ) {
    return this.service.moderate(id, dto, user);
  }

  @Delete('reviews/:id')
  @Permissions(PERMISSIONS.PRODUCT_CONTENT_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.deleteReview(id);
  }

  @Get('products/:productId/banners')
  banners(@Param('productId') id: string) {
    return this.service.banners(id);
  }

  @Post('products/:productId/banners')
  @Permissions(PERMISSIONS.PRODUCT_CONTENT_MANAGE)
  add(@Param('productId') id: string, @Body() dto: CreateReviewBannerDto) {
    return this.service.createBanner(id, dto);
  }

  @Patch('banners/:id')
  @Permissions(PERMISSIONS.PRODUCT_CONTENT_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateReviewBannerDto) {
    return this.service.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  @Permissions(PERMISSIONS.PRODUCT_CONTENT_MANAGE)
  delete(@Param('id') id: string) {
    return this.service.deleteBanner(id);
  }
}
