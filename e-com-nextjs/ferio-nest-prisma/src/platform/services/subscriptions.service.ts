import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '../generated/platform-client';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';

/** PO-004: grace period before a past-due subscription may be suspended. */
const GRACE_PERIOD_DAYS = 7;

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
  /** Operator-explicit bypass of the 7-day grace window (audited via note). */
  overrideGracePeriod?: boolean;
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

    // PO-004: a past-due subscription enters a 7-day grace period. Suspension
    // is refused until the latest PAST_DUE event is at least that old.
    if (
      subscription.status === 'PAST_DUE' &&
      to === 'SUSPENDED' &&
      input.overrideGracePeriod !== true
    ) {
      const pastDueEvent = await this.platform.client.subscriptionEvent.findFirst({
        where: { subscriptionId: subscription.id, toStatus: 'PAST_DUE' },
        orderBy: { createdAt: 'desc' },
      });
      const graceEndsAt =
        (pastDueEvent?.createdAt ?? new Date()).getTime() +
        GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() < graceEndsAt) {
        throw new ConflictException('SUBSCRIPTION_GRACE_PERIOD_ACTIVE');
      }
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

  /**
   * PO-002: internal Ferio tenants get the explicit INTERNAL-style plan
   * (key 'internal') with ACTIVE status — never faked as a paid subscription.
   */
  async startInternal(organizationId: string, actorId?: string) {
    const existing = await this.platform.client.subscription.findUnique({
      where: { organizationId },
    });
    if (existing) throw new ConflictException('SUBSCRIPTION_ALREADY_EXISTS');
    const plan = await this.platform.client.plan.findUnique({ where: { key: 'internal' } });
    if (!plan || !plan.isActive) throw new NotFoundException('INTERNAL_PLAN_NOT_SEEDED');
    return this.platform.client.subscription.create({
      data: { organizationId, planId: plan.id, status: 'ACTIVE' },
    });
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
