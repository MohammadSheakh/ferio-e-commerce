import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { PurchaseActivityQueryDto } from './purchase-activity.dto';
import { PurchaseActivityService } from './purchase-activity.service';

@Controller('purchase-activity')
export class PurchaseActivityController {
  constructor(private readonly service: PurchaseActivityService) {}

  @Get()
  get(@Query() query: PurchaseActivityQueryDto) {
    return this.service.getPublic(query);
  }
}

@Controller('admin/purchase-activity')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.PURCHASE_ACTIVITY_READ)
export class AdminPurchaseActivityController {
  constructor(private readonly service: PurchaseActivityService) {}

  @Get()
  get(@Query() query: PurchaseActivityQueryDto) {
    return this.service.getAdmin(query);
  }
}
