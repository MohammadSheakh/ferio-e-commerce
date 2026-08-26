import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import {
  CreateOrUpdateSettingsDto,
  SettingsPaginateQueryDto,
  SettingsCursorPaginateQueryDto,
} from '../dto/settings.dto';
import { SettingsType } from '../constants/settings.constants';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  RolesGuard,
  Roles,
  Public,
  TransformResponseInterceptor,
  SlidingWindowRateLimitGuard,
  RateLimit,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { SETTINGS_RATE_LIMITS } from '../constants/settings.cache.constants';
import { TenantMembershipGuard } from '../../../tenancy/tenant-membership.guard';

@Controller('settings')
@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, SlidingWindowRateLimitGuard)
@UseInterceptors(TransformResponseInterceptor)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @UseGuards(TenantMembershipGuard)
  @ApiOperation({
    summary: 'Create or update settings',
    description: 'Create or update static content (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @Roles('admin', 'subAdmin')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @RateLimit(SETTINGS_RATE_LIMITS.MANAGE_SETTINGS)
  async createOrUpdateSettings(
    @Query('type', new ParseEnumPipe(SettingsType)) type: SettingsType,
    @Body() dto: CreateOrUpdateSettingsDto,
    @User() actor: UserPayload,
  ) {
    const result = await this.settingsService.createOrUpdateSettings(
      type,
      {
        ...dto,
        type,
      },
      actor,
    );
    return {
      success: true,
      data: result,
      message: `${type} updated successfully`,
    };
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get settings by type',
    description: 'Get static content by type (Public)',
  })
  @ApiQuery({ name: 'type', enum: SettingsType })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @RateLimit(SETTINGS_RATE_LIMITS.GET_SETTINGS)
  async getSettingsByType(
    @Query('type', new ParseEnumPipe(SettingsType)) type: SettingsType,
  ) {
    const result = await this.settingsService.getSettingsByType(type);
    return {
      success: true,
      data: result,
      message: `${type} fetched successfully`,
    };
  }

  @Get('all')
  @UseGuards(TenantMembershipGuard)
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Get all static content (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'All settings retrieved' })
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  @RateLimit(SETTINGS_RATE_LIMITS.MANAGE_SETTINGS)
  async getAllSettings() {
    const result = await this.settingsService.getAllSettings();
    return {
      success: true,
      data: result,
      message: 'All settings retrieved successfully',
    };
  }

  @Get('paginate')
  @UseGuards(TenantMembershipGuard)
  @ApiOperation({
    summary: 'Get all settings with pagination',
    description: 'Get all static content with pagination (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  @RateLimit(SETTINGS_RATE_LIMITS.MANAGE_SETTINGS)
  async getAllWithPagination(@Query() query: SettingsPaginateQueryDto) {
    const { page, limit, sortBy, ...filters } = query;
    const options = {
      page,
      limit,
      sortBy: sortBy || 'type',
    };

    // Define include and select projections here instead of receiving them from the frontend query
    const include = undefined; // Settings model currently has no relations to include, but kept here for pattern consistency
    const select = undefined; // You can define a select projection here if needed, e.g., { id: true, type: true, details: true }

    const result = await this.settingsService.getAllWithPagination(
      filters,
      options,
      include,
      select,
    );
    return {
      success: true,
      data: result,
      message: 'Settings with pagination retrieved successfully',
    };
  }

  @Get('paginate/v2')
  @UseGuards(TenantMembershipGuard)
  @ApiOperation({
    summary: 'Get all settings with cursor pagination (v2)',
    description:
      'Get all static content with cursor-based pagination (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  @RateLimit(SETTINGS_RATE_LIMITS.MANAGE_SETTINGS)
  async getAllWithPaginationCursor(
    @Query() query: SettingsCursorPaginateQueryDto,
  ) {
    const { limit, cursor, sortBy, ...filters } = query;
    const options = {
      limit,
      cursor,
      sortBy: sortBy || 'id',
    };

    const include = undefined;
    const select = undefined;

    const result = await this.settingsService.getAllWithPaginationCursor(
      filters,
      options,
      include,
      select,
    );
    return {
      success: true,
      data: result,
      message: 'Settings with cursor pagination retrieved successfully',
    };
  }

  @Delete()
  @UseGuards(TenantMembershipGuard)
  @ApiOperation({
    summary: 'Delete settings',
    description: 'Delete settings by type (Admin only)',
  })
  @ApiQuery({ name: 'type', enum: SettingsType })
  @ApiResponse({ status: 200, description: 'Settings deleted successfully' })
  @Roles('admin')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @RateLimit(SETTINGS_RATE_LIMITS.MANAGE_SETTINGS)
  async deleteSettingsByType(
    @Query('type', new ParseEnumPipe(SettingsType)) type: SettingsType,
    @User() actor: UserPayload,
  ) {
    await this.settingsService.deleteSettingsByType(type, actor);
    return { success: true, message: `${type} deleted successfully` };
  }
}
