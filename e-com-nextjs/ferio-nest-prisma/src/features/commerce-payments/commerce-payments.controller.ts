import {
  All,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CommercePaymentProvider } from '@prisma/client';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import {
  GLOBAL_RATE_LIMITS,
  RateLimit,
  SlidingWindowRateLimitGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { CommercePaymentsService } from './commerce-payments.service';
import {
  InitiateCommercePaymentDto,
  RetryCommercePaymentDto,
} from './dto/commerce-payment.dto';
import { PaymentRecoveryQueue } from './payment-recovery.queue';
import { PaymentLedgerQueryDto } from './dto/payment-ledger.dto';

@ApiTags('Payments')
@Controller('payments')
export class PublicCommercePaymentsController {
  constructor(private readonly payments: CommercePaymentsService) {}

  @Get('providers')
  providers() {
    return this.payments.providers();
  }

  @Post('initiate')
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.strict)
  initiate(@Body() dto: InitiateCommercePaymentDto) {
    return this.payments.initiate(dto.orderId, dto.reference, dto.phone, dto.provider);
  }

  @Post('retry')
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.strict)
  retry(@Body() dto: RetryCommercePaymentDto) {
    return this.payments.retry(dto.reference, dto.phone, dto.provider);
  }

  /**
   * Handle Payment Provider Callbacks & IPNs
   * -------------------------------------------------------------
   * Hosted gateways (SSLCommerz, aamarPay) POST/GET payment results here.
   * For IPNs: Returns HTTP 200 JSON.
   * For Browser Callbacks: Validates transaction and redirects user to /order-confirmation.
   */
  @All('callback/:provider/:eventType')
  @UseGuards(SlidingWindowRateLimitGuard)
  @RateLimit(GLOBAL_RATE_LIMITS.user)
  async callback(
    @Param('provider') provider: CommercePaymentProvider,
    @Param('eventType') eventType: string, // e.g. success, fail, cancel, ipn
    @Body() payload: Record<string, unknown>,
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    if (!['SSLCOMMERZ', 'AAMARPAY'].includes(provider))
      throw new BadRequestException('Unknown payment provider');

    // Process callback & validate with SSLCommerz server API
    const result = await this.payments.processCallback(provider, eventType, {
      ...query,
      ...payload,
    });

    // IPN background notifications do not redirect browser
    if (eventType === 'ipn') return response.status(200).json(result);

    // Redirect browser to customer web app corresponding page
    const customerUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3000';
    const context = await this.payments.returnContext(result.orderId);
    const redirectQuery = new URLSearchParams({
      payment: result.paid ? 'success' : eventType,
      ...(context?.reference ? { reference: context.reference } : {}),
      ...(context?.status ? { status: context.status } : {}),
    });

    // Route to dedicated status pages or fallback to order-confirmation
    let targetPath = '/order-confirmation';
    if (eventType === 'fail' || eventType === 'failed') {
      targetPath = '/payment/failed';
    } else if (eventType === 'cancel') {
      targetPath = '/payment/cancel';
    } else if (result.paid) {
      targetPath = '/order-confirmation';
    }

    return response.redirect(
      303,
      `${customerUrl}${targetPath}?${redirectQuery}`,
    );
  }
}

@ApiTags('Admin Payments')
@ApiBearerAuth()
@Controller('admin/payments')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.PAYMENTS_READ)
export class AdminCommercePaymentsController {
  constructor(
    private readonly payments: CommercePaymentsService,
    private readonly recovery: PaymentRecoveryQueue,
  ) {}
  @Get('attempts')
  attempts(@Query() query: PaymentLedgerQueryDto) {
    return this.payments.listAttempts(query);
  }

  @Get('attempts/:id')
  attempt(@Param('id') id: string) {
    return this.payments.attemptDetail(id);
  }
  @Get('providers')
  providers() {
    return this.payments.providers();
  }

  @Get('recovery/queue-health')
  recoveryHealth() {
    return this.recovery.health();
  }

  @Post('recovery/sweep')
  @Permissions(PERMISSIONS.PAYMENTS_MANAGE)
  recoverySweep(@User() actor: UserPayload) {
    return this.recovery.enqueueSweep(actor);
  }
}
