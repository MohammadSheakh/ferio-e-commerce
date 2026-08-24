import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '../generated/platform-client';
import type { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';

/** Subscription lifecycle state machine (ADR-0006). */
const ALLOWED_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAST_DUE', 'CANCELLED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'CANCELLED'], // grace period recovery
  SUSPENDED: ['ACTIVE', 'CANCELLED'], // reactivation
  CANCELLED: ['ACTIVE'], // explicit reactivation only
};

export interface TransitionSubscriptionInput {
  actorId?: string;
  note?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async startTrial(organizationId: string, planKey: string, trialDays: number) {
    const existing = await this.platform.client.subscription.findUnique({
      where: { organizationId },
    });
    if (existing) throw new ConflictException('SUBSCRIPTION_ALREADY_EXISTS');
    const plan = await this.platform.client.plan.findUnique({ where: { key: planKey } });
    if (!plan || !plan.isActive) throw new NotFoundException('PLAN_NOT_FOUND');
    return this.platform.client.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  async getForOrganization(organizationId: string) {
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
      include: { plan: { include: { entitlements: true } } },
    });
    if (!subscription) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');
    return subscription;
  }

  async transition(
    organizationId: string,
    to: SubscriptionStatus,
    input: TransitionSubscriptionInput = {},
  ) {
    const subscription = await this.getForOrganization(organizationId);
    const allowed = ALLOWED_SUBSCRIPTION_TRANSITIONS[subscription.status] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `SUBSCRIPTION_TRANSITION_INVALID:${subscription.status}->${to}`,
      );
    }

    const updated = await this.platform.client.$transaction(async (tx) => {
      const next = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: to,
          cancelledAt: to === 'CANCELLED' ? new Date() : null,
          currentPeriodStart: input.currentPeriodStart ?? subscription.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd ?? subscription.currentPeriodEnd,
          planId: input.note === undefined ? subscription.planId : subscription.planId,
        },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          fromStatus: subscription.status,
          toStatus: to,
          actorId: input.actorId,
          note: input.note,
        },
      });
      return next;
    });

    await this.audit.record({
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      entityType: 'Subscription',
      entityId: subscription.id,
      actorId: input.actorId,
      previousValue: { status: subscription.status },
      newValue: { status: to },
      metadata: { organizationId, note: input.note },
    });
    return updated;
  }

  /** Plan changes never destroy data; entitlements simply re-evaluate. */
  async changePlan(organizationId: string, planKey: string, actorId?: string) {
    const subscription = await this.getForOrganization(organizationId);
    const plan = await this.platform.client.plan.findUnique({ where: { key: planKey } });
    if (!plan || !plan.isActive) throw new NotFoundException('PLAN_NOT_FOUND');
    const updated = await this.platform.client.subscription.update({
      where: { id: subscription.id },
      data: { planId: plan.id },
    });
    await this.audit.record({
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      entityType: 'Subscription',
      entityId: subscription.id,
      actorId,
      previousValue: { planId: subscription.planId },
      newValue: { planId: plan.id, planKey },
    });
    return updated;
  }
}
