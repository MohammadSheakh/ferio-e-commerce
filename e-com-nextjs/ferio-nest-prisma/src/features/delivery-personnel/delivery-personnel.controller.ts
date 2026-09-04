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
import {
  AuthGuard,
  GLOBAL_RATE_LIMITS,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
  SlidingWindowRateLimitGuard,
  RateLimit,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import {
  ApplyDeliveryPersonnelDto,
  AssignOrderDto,
  CreateDeliveryPersonnelDto,
  QueryDeliveryPersonnelDto,
  UpdateApprovalDto,
  UpdateDeliveryOrderStatusDto,
  UpdateDeliveryPersonnelDto,
  UpdateLocationDto,
} from './delivery-personnel.dto';
import { DeliveryPersonnelService } from './delivery-personnel.service';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';

@Controller('delivery-personnel')
export class DeliveryPersonnelController {
  constructor(private readonly service: DeliveryPersonnelService) {}

  /**
   * Public registration endpoint for prospective Bangladesh riders
   */
  @Post('apply')
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.auth)
  apply(@Body() dto: ApplyDeliveryPersonnelDto) {
    return this.service.apply(dto);
  }

  /**
   * Admin: List all riders & applicants
   */
  @Get('admin/list')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_READ)
  listAll(@Query() query: QueryDeliveryPersonnelDto) {
    return this.service.listAll(query);
  }

  /**
   * Admin: Direct create & activate rider account
   */
  @Post('admin/create')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_MANAGE)
  createDirectByAdmin(@Body() dto: CreateDeliveryPersonnelDto) {
    return this.service.createDirectByAdmin(dto);
  }

  /**
   * Admin: Get visual OpenStreetMap data (riders path sequence & active order locations)
   */
  @Get('admin/map-data')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_READ)
  getDeliveryMapData() {
    return this.service.getDeliveryMapData();
  }

  /**
   * Admin: Clear rider location waypoint history (removes 1, 2, 3 path sequence, keeps last current location)
   */
  @Delete('admin/:id/location-history')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_MANAGE)
  clearLocationHistory(@Param('id') id: string) {
    return this.service.clearLocationHistory(id);
  }

  /**
   * Admin: Approve or Reject applicant
   */
  @Patch('admin/:id/approval')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_MANAGE)
  updateApproval(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.service.updateApproval(id, dto);
  }

  /**
   * Admin: Update rider profile information (including reset password)
   */
  @Patch('admin/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_MANAGE)
  updateRiderByAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryPersonnelDto,
  ) {
    return this.service.updateRiderByAdmin(id, dto);
  }

  /**
   * Admin: Get single rider detail
   */
  @Get('admin/:id')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_READ)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /**
   * Admin: Assign order to rider
   */
  @Patch('admin/assign-order')
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
  @Roles('admin')
  @Permissions(PERMISSIONS.DELIVERY_PERSONNEL_MANAGE)
  assignOrder(@Body() dto: AssignOrderDto) {
    return this.service.assignOrder(dto);
  }

  /**
   * Rider PWA: Get my assigned deliveries
   */
  @Get('my-orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('delivery_man')
  getMyOrders(@User() actor: UserPayload) {
    return this.service.getMyAssignedOrders(actor.userId);
  }

  /**
   * Rider PWA: Update delivery order status
   */
  @Patch('my-orders/:orderId/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('delivery_man')
  updateDeliveryOrderStatus(
    @User() actor: UserPayload,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateDeliveryOrderStatusDto,
  ) {
    return this.service.updateDeliveryOrderStatus(actor.userId, orderId, dto);
  }

  /**
   * Rider PWA: Get my rider profile
   */
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('delivery_man')
  getMyProfile(@User() actor: UserPayload) {
    return this.service.getMyProfile(actor.userId);
  }

  /**
   * Rider PWA: Toggle online / offline status
   */
  @Patch('online-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('delivery_man')
  toggleOnlineStatus(
    @User() actor: UserPayload,
    @Body() dto: { isOnline: boolean },
  ) {
    return this.service.toggleOnlineStatus(actor.userId, dto.isOnline);
  }

  /**
   * Rider PWA: Update GPS location (Zero-cost browser geolocation)
   */
  @Post('location')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('delivery_man')
  updateLocation(@User() actor: UserPayload, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(actor.userId, dto);
  }
}
