import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  RateLimit,
  RolesGuard,
  SlidingWindowRateLimitGuard,
} from '@app/common';
import { CreateStorefrontAnalyticsEventDto } from './storefront-analytics.dto';
import { StorefrontAnalyticsService } from './storefront-analytics.service';

@ApiTags('Storefront Analytics')
@Controller('storefront-analytics')
export class StorefrontAnalyticsController {
  constructor(private readonly service: StorefrontAnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'analytics_event' })
  @ApiOperation({ summary: 'Accept a privacy-safe storefront analytics event' })
  create(@Body() dto: CreateStorefrontAnalyticsEventDto) {
    return this.service.create(dto);
  }

  @Get('dashboard')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Get aggregated storefront and business analytics' })
  getAnalyticsDashboard(@Query('days') daysStr?: string) {
    const days = daysStr ? Math.max(1, Math.min(365, parseInt(daysStr, 10))) : 30;
    return this.service.getAnalyticsOverview(days);
  }
}

