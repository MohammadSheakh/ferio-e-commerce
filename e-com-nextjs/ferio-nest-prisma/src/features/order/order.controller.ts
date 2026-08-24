import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
import {
  AuthGuard,
  GLOBAL_RATE_LIMITS,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  RateLimit,
  Roles,
  RolesGuard,
  SlidingWindowRateLimitGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import {
  CancelOrderDto,
  ConfirmOrderDto,
  CreateFulfillmentExceptionDto,
  OrderQueryDto,
  ResolveFulfillmentExceptionDto,
  PlaceOrderDto,
  ScheduleStorePickupDto,
  TrackOrderDto,
  UpdateCodPolicyDto,
  UpdateFulfillmentDto,
  UpdateStorePickupStatusDto,
  VerifyStoreHandoverDto,
} from './dto/order.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@Controller('checkout/orders')
export class PublicOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Convert a valid checkout draft into one order' })
  placeOrder(
    @Body() dto: PlaceOrderDto,
    @Headers('x-cart-token') cartToken?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orderService.placeOrder(
      dto.paymentMethod,
      cartToken,
      idempotencyKey,
    );
  }

  @Post('wallet')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for a valid checkout draft from customer wallet' })
  placeWalletOrder(
    @Headers('x-cart-token') cartToken: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @User() actor: UserPayload,
  ) {
    return this.orderService.placeOrder(
      'WALLET',
      cartToken,
      idempotencyKey,
      actor,
    );
  }
}

@ApiTags('Order Tracking & Store Pickup')
@Controller('orders')
export class PublicOrderTrackingController {
  constructor(private readonly orderService: OrderService) {}

  @Post('track')
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.user)
  @ApiOperation({
    summary: 'Track an order using its reference and verified phone',
  })
  trackOrder(@Body() dto: TrackOrderDto) {
    return this.orderService.trackOrder(dto);
  }

  @Patch(':id/store-pickup/schedule')
  @UseGuards(AuthGuard)
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.user)
  @ApiOperation({
    summary: 'Schedule or update your own store pickup date and time',
  })
  scheduleStorePickup(
    @Param('id') id: string,
    @Body() dto: ScheduleStorePickupDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.scheduleStorePickup(id, dto, actor);
  }
}

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.ORDERS_READ)
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getOrders(@Query() query: OrderQueryDto) {
    return this.orderService.getOrders(query);
  }

  @Get('cod-policy')
  getCodPolicy() {
    return this.orderService.getCodPolicy();
  }

  @Patch('cod-policy')
  @Permissions(PERMISSIONS.ORDER_POLICY_MANAGE)
  updateCodPolicy(@Body() dto: UpdateCodPolicyDto, @User() actor: UserPayload) {
    return this.orderService.updateCodPolicy(dto, actor);
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Post(':id/confirm')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  confirmOrder(
    @Param('id') id: string,
    @Body() dto: ConfirmOrderDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.confirmOrder(id, dto, actor);
  }

  @Post(':id/cancel')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.cancelOrder(id, dto, actor);
  }

  @Post(':id/fulfillment')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  updateFulfillment(
    @Param('id') id: string,
    @Body() dto: UpdateFulfillmentDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.updateFulfillment(id, dto, actor);
  }

  @Patch(':id/store-pickup/status')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  @ApiOperation({
    summary: 'Update store pickup lifecycle status (e.g. READY_FOR_PICKUP)',
  })
  updateStorePickupStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStorePickupStatusDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.updateStorePickupStatus(id, dto.status, actor);
  }

  @Post(':id/store-pickup/verify-handover')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  @ApiOperation({
    summary:
      'Verify customer 6-digit OTP code at store desk and complete handover',
  })
  verifyStoreHandover(
    @Param('id') id: string,
    @Body() dto: VerifyStoreHandoverDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.verifyStoreHandover(id, dto.otp, actor);
  }

  @Post(':id/fulfillment-exceptions')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  createFulfillmentException(
    @Param('id') id: string,
    @Body() dto: CreateFulfillmentExceptionDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.createFulfillmentException(id, dto, actor);
  }

  @Post(':id/fulfillment-exceptions/:exceptionId/resolve')
  @Permissions(PERMISSIONS.ORDERS_MANAGE)
  resolveFulfillmentException(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: ResolveFulfillmentExceptionDto,
    @User() actor: UserPayload,
  ) {
    return this.orderService.resolveFulfillmentException(
      id,
      exceptionId,
      dto,
      actor,
    );
  }
}
