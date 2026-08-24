import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TenantMembershipGuard } from '../../../tenancy/tenant-membership.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
import { UpdateCommerceSettingsDto } from '../dto/commerce-settings.dto';
import { CommerceSettingsService } from '../services/commerce-settings.service';

@ApiTags('Store Configuration')
@Controller('store/config')
export class PublicCommerceSettingsController {
  constructor(private readonly commerceSettings: CommerceSettingsService) {}

  @Get()
  get() {
    return this.commerceSettings.getPublic();
  }
}

@ApiTags('Admin Commerce Settings')
@ApiBearerAuth()
@Controller('admin/commerce-settings')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.SETTINGS_READ)
export class AdminCommerceSettingsController {
  constructor(private readonly commerceSettings: CommerceSettingsService) {}

  @Get()
  get() {
    return this.commerceSettings.get();
  }

  @Patch()
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  update(@Body() dto: UpdateCommerceSettingsDto, @User() actor: UserPayload) {
    return this.commerceSettings.update(dto, actor);
  }
}
