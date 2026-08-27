import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
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
import { CheckoutService } from './checkout.service';
import {
  CheckoutPreviewDto,
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from './dto/checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class PublicCheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('delivery-options')
  @ApiOperation({ summary: 'List active checkout delivery districts' })
  getDeliveryOptions() {
    return this.checkoutService.getDeliveryOptions();
  }

  @Get('payment-options')
  getPaymentOptions() {
    return this.checkoutService.getPaymentOptions();
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Validate and persist a server-priced checkout draft',
  })
  preview(
    @Body() dto: CheckoutPreviewDto,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return this.checkoutService.preview(dto, cartToken);
  }
}

@ApiTags('Admin Delivery')
@ApiBearerAuth()
@Controller('admin/delivery-zones')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.DELIVERY_ZONES_READ)
export class AdminDeliveryController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get()
  getDeliveryZones() {
    return this.checkoutService.getDeliveryZones();
  }

  @Post()
  @Permissions(PERMISSIONS.DELIVERY_ZONES_MANAGE)
  createDeliveryZone(
    @Body() dto: CreateDeliveryZoneDto,
    @User() actor: UserPayload,
  ) {
    return this.checkoutService.createDeliveryZone(dto, actor);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DELIVERY_ZONES_MANAGE)
  updateDeliveryZone(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryZoneDto,
    @User() actor: UserPayload,
  ) {
    return this.checkoutService.updateDeliveryZone(id, dto, actor);
  }
}
