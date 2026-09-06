import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import {
  PlansService,
  type CreatePlanInput,
  type UpdatePlanInput,
} from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import type { PlatformRequest } from './platform-request.type';
import type { SubscriptionStatus } from './generated/platform-client';

@Controller('platform')
@UseGuards(PlatformAuthGuard)
export class PlatformCatalogController {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Post('plans')
  @PlatformPermissions('subscription:write')
  createPlan(@Body() body: CreatePlanInput, @Req() request: PlatformRequest) {
    return this.plans.create({
      ...body,
      actorId: request.platformPrincipal?.platformUserId,
    });
  }

  @Patch('plans/:id')
  @PlatformPermissions('subscription:write')
  updatePlan(
    @Param('id') id: string,
    @Body() body: UpdatePlanInput,
    @Req() request: PlatformRequest,
  ) {
    return this.plans.update(id, {
      ...body,
      actorId: request.platformPrincipal?.platformUserId,
    });
  }

  @Get('plans')
  @PlatformPermissions('subscription:read')
  listPlans() {
    return this.plans.list();
  }

  @Post('organizations/:id/subscription/trial')
  @PlatformPermissions('subscription:write')
  startTrial(
    @Param('id') id: string,
    @Body() body: { planKey: string; trialDays?: number },
  ) {
    return this.subscriptions.startTrial(
      id,
      body.planKey,
      Math.min(body.trialDays ?? 14, 90),
    );
  }

  @Patch('organizations/:id/subscription/status')
  @PlatformPermissions('subscription:write')
  transitionSubscription(
    @Param('id') id: string,
    @Body() body: { status: SubscriptionStatus; note?: string },
    @Req() request: PlatformRequest,
  ) {
    return this.subscriptions.transition(id, body.status, {
      actorId: request.platformPrincipal?.platformUserId,
      note: body.note,
    });
  }
}
