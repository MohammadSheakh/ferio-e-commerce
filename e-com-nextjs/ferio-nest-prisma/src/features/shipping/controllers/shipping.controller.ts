import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantMembershipGuard } from '../../../tenancy/tenant-membership.guard';
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
import { ShipmentProviderCode } from '@prisma/client';
import type { Response } from 'express';
import {
  CreateShipmentDto,
  UpdateShipmentProviderDto,
} from '../dto/shipping.dto';
import { ShippingService } from '../services/shipping.service';
import { ShippingWebhookQueue } from '../queues/shipping-webhook.queue';
import { ShippingPollingService } from '../services/shipping-polling.service';
import { ShippingPollingQueue } from '../queues/shipping-polling.queue';

@ApiTags('Admin Shipping')
@ApiBearerAuth()
@Controller('admin/shipping')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.SHIPPING_READ)
export class AdminShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly webhookQueue: ShippingWebhookQueue,
    private readonly polling: ShippingPollingService,
    private readonly pollingQueue: ShippingPollingQueue,
  ) {}

  @Get('providers')
  getProviders() {
    return this.shippingService.getProviders();
  }

  @Get('scorecard')
  getScorecard() {
    return this.shippingService.getScorecard();
  }

  @Post('router/recommend')
  recommendCourier(
    @Body()
    dto: {
      district: string;
      upazila?: string;
      weightGrams: number;
      codAmount: number;
      urgent?: boolean;
    },
  ) {
    return this.shippingService.courierRouter.recommendProvider(dto);
  }

  @Get('shipments')
  getShipments() {
    return this.shippingService.getShipments();
  }

  @Get('webhooks')
  getWebhookLogs() {
    return this.shippingService.getWebhookLogs();
  }

  @Get('webhooks/queue-health')
  getWebhookQueueHealth() {
    return this.webhookQueue.health();
  }

  @Post('webhooks/:id/retry')
  @Permissions(PERMISSIONS.SHIPPING_MANAGE)
  retryWebhook(@Param('id') id: string, @User() actor: UserPayload) {
    return this.webhookQueue.enqueueRetry(id, actor);
  }

  @Get('polls')
  getPollAttempts() {
    return this.polling.getAttempts();
  }

  @Get('polls/queue-health')
  getPollingQueueHealth() {
    return this.pollingQueue.health();
  }

  @Post('shipments/:id/poll')
  @Permissions(PERMISSIONS.SHIPPING_MANAGE)
  pollShipment(@Param('id') id: string, @User() actor: UserPayload) {
    return this.pollingQueue.enqueueShipment(id, actor);
  }

  @Patch('providers/:code')
  @Permissions(PERMISSIONS.SHIPPING_PROVIDER_MANAGE)
  updateProvider(
    @Param('code') code: ShipmentProviderCode,
    @Body() dto: UpdateShipmentProviderDto,
    @User() actor: UserPayload,
  ) {
    return this.shippingService.updateProvider(code, dto, actor);
  }

  @Get('orders/:orderId')
  getOrderShipment(@Param('orderId') orderId: string) {
    return this.shippingService.getOrderShipment(orderId);
  }

  @Post('orders/:orderId')
  @Permissions(PERMISSIONS.SHIPPING_MANAGE)
  createShipment(
    @Param('orderId') orderId: string,
    @Body() dto: CreateShipmentDto,
    @User() actor: UserPayload,
  ) {
    return this.shippingService.createShipment(orderId, dto, actor);
  }
}

@ApiTags('Courier Webhooks')
@Controller('webhooks/couriers')
export class CourierWebhookController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post(':provider')
  async receive(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const carrybeeHeader = headers['x-cb-webhook-integration-header'];
    const result = await this.shippingService.processWebhook(
      provider,
      headers,
      body,
    );

    if (carrybeeHeader && typeof carrybeeHeader === 'string') {
      res.setHeader('X-CB-Webhook-Integration-Header', carrybeeHeader);
      return res.status(HttpStatus.ACCEPTED).json(result);
    }

    return res.status(HttpStatus.OK).json(result);
  }
}
