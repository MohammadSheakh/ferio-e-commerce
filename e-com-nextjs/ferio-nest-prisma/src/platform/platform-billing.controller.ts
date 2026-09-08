import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { PlatformBillingService } from './services/platform-billing.service';
import {
  CreatePlatformInvoiceDto,
  ManualBillingActionDto,
  PlatformBillingCallbackQueryDto,
} from './dto/billing.dto';
import type { PlatformRequest } from './platform-request.type';

/**
 * Operator endpoints (platform-realm guarded) for SaaS billing
 * administration — MT-9 §12.3 / PO-006.
 */
@ApiTags('Platform Billing')
@Controller('platform/billing')
@UseGuards(PlatformAuthGuard)
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Post('invoices')
  @PlatformPermissions('saas_billing:write')
  ensureInvoice(
    @Body() body: CreatePlatformInvoiceDto,
    @Req() request: PlatformRequest,
  ) {
    return this.billing.ensureInvoice({
      organizationId: body.organizationId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      actorId: request.platformPrincipal?.platformUserId,
      reason: body.reason,
    });
  }

  /** Starts an SSLCommerz hosted session; operator redirects the payer. */
  @Post('invoices/:id/pay')
  @PlatformPermissions('saas_billing:write')
  pay(
    @Param('id') id: string,
    @Body() body: ManualBillingActionDto,
    @Req() request: PlatformRequest,
  ) {
    return this.billing.initiatePayment(id, {
      actorId: request.platformPrincipal?.platformUserId,
      reason: body.reason,
    });
  }

  @Get('invoices/:id/receipt')
  @PlatformPermissions('saas_billing:read')
  receipt(@Param('id') id: string) {
    return this.billing.receipt(id);
  }

  @Get('billing-configured')
  @PlatformPermissions('saas_billing:read', 'saas_billing:write')
  configured() {
    return { configured: this.billing.billingConfigured() };
  }
}

/**
 * PUBLIC callback surface for SSLCommerz. No platform auth (gateways cannot
 * authenticate as operators); integrity comes from the unguessable payment
 * reference plus server-to-server val_id validation inside the service.
 */
@ApiTags('Platform Billing')
@Controller('platform/billing')
export class PlatformBillingCallbackController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('callback')
  async callback(
    @Query() query: PlatformBillingCallbackQueryDto,
  ): Promise<{ applied: boolean; duplicate?: boolean; paid?: boolean }> {
    return this.billing.applyCallbackOutcome({
      reference: query.ref,
      valId: query.val_id,
      outcome: query.outcome,
    });
  }

  @Post('callback')
  postCallback(@Query() query: PlatformBillingCallbackQueryDto) {
    return this.callback(query);
  }
}
