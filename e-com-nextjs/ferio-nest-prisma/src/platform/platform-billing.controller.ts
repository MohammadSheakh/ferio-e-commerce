import {
  BadRequestException,
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
import type { Request } from 'express';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { PlatformBillingService } from './services/platform-billing.service';

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
    @Body()
    body: { organizationId: string; periodStart: string; periodEnd: string },
  ) {
    if (!body.organizationId || !body.periodStart || !body.periodEnd) {
      throw new BadRequestException('organizationId, periodStart, periodEnd required');
    }
    return this.billing.ensureInvoice({
      organizationId: body.organizationId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });
  }

  /** Starts an SSLCommerz hosted session; operator redirects the payer. */
  @Post('invoices/:id/pay')
  @PlatformPermissions('saas_billing:write')
  pay(@Param('id') id: string) {
    return this.billing.initiatePayment(id);
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
    @Query('ref') ref: string,
    @Query('outcome') outcome: 'success' | 'fail' | 'cancel' | 'ipn',
    @Query('val_id') valId?: string,
    @Req() _request?: Request,
  ): Promise<{ applied: boolean; duplicate?: boolean; paid?: boolean }> {
    if (!ref || !outcome) throw new BadRequestException('CALLBACK_PARAMETERS_REQUIRED');
    return this.billing.applyCallbackOutcome({ reference: ref, valId, outcome });
  }

  @Post('callback')
  postCallback(
    @Query('ref') ref: string,
    @Query('outcome') outcome: 'success' | 'fail' | 'cancel' | 'ipn',
    @Query('val_id') valId?: string,
  ) {
    return this.callback(ref, outcome, valId);
  }
}
