import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';

export interface PlanEntitlementInput {
  featureKey: string;
  enabled?: boolean;
  limit?: number | null;
}

export interface CreatePlanInput {
  key: string;
  displayName: string;
  billingInterval?: 'MONTHLY' | 'YEARLY';
  amountMinor?: number;
  entitlements: PlanEntitlementInput[];
  actorId?: string;
}

export interface UpdatePlanInput {
  displayName?: string;
  billingInterval?: 'MONTHLY' | 'YEARLY';
  amountMinor?: number;
  isActive?: boolean;
  entitlements?: PlanEntitlementInput[];
  actorId?: string;
}

@Injectable()
export class PlansService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async create(input: CreatePlanInput) {
    const key = input.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!key) throw new ConflictException('PLAN_KEY_INVALID');
    try {
      const plan = await this.platform.client.plan.create({
        data: {
          key,
          displayName: input.displayName.trim(),
          billingInterval: input.billingInterval ?? 'MONTHLY',
          amountMinor: input.amountMinor ?? 0,
          entitlements: {
            create: input.entitlements.map((entitlement) => ({
              featureKey: entitlement.featureKey.trim(),
              enabled: entitlement.enabled ?? true,
              limit: entitlement.limit ?? null,
            })),
          },
        },
        include: { entitlements: true },
      });
      await this.audit.record({
        action: 'PLAN_CREATED',
        entityType: 'Plan',
        entityId: plan.id,
        actorId: input.actorId,
        newValue: { key, amountMinor: plan.amountMinor },
      });
      return plan;
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('PLAN_KEY_TAKEN');
      throw error;
    }
  }

  async list() {
    return this.platform.client.plan.findMany({
      include: { entitlements: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, input: UpdatePlanInput) {
    const existing = await this.platform.client.plan.findUnique({
      where: { id },
      include: { entitlements: true },
    });
    if (!existing) throw new NotFoundException('PLAN_NOT_FOUND');

    const entitlements = input.entitlements?.map((entitlement) => {
      const featureKey = entitlement.featureKey.trim().toLowerCase();
      if (!/^[a-z][a-z0-9_-]*$/.test(featureKey)) {
        throw new ConflictException('PLAN_FEATURE_KEY_INVALID');
      }
      if (
        entitlement.limit !== undefined &&
        entitlement.limit !== null &&
        (!Number.isInteger(entitlement.limit) || entitlement.limit < 0)
      ) {
        throw new ConflictException('PLAN_FEATURE_LIMIT_INVALID');
      }
      return {
        featureKey,
        enabled: entitlement.enabled ?? true,
        limit: entitlement.limit ?? null,
      };
    });
    const uniqueFeatureKeys = new Set(entitlements?.map((item) => item.featureKey));
    if (entitlements && uniqueFeatureKeys.size !== entitlements.length) {
      throw new ConflictException('PLAN_FEATURE_DUPLICATE');
    }

    const plan = await this.platform.client.$transaction(async (tx) => {
      if (entitlements) {
        await tx.planEntitlement.deleteMany({ where: { planId: id } });
      }
      return tx.plan.update({
        where: { id },
        data: {
          displayName: input.displayName?.trim() || undefined,
          billingInterval: input.billingInterval,
          amountMinor: input.amountMinor,
          isActive: input.isActive,
          ...(entitlements
            ? { entitlements: { create: entitlements } }
            : {}),
        },
        include: { entitlements: true },
      });
    });

    await this.audit.record({
      action: 'PLAN_UPDATED',
      entityType: 'Plan',
      entityId: plan.id,
      actorId: input.actorId,
      previousValue: {
        displayName: existing.displayName,
        billingInterval: existing.billingInterval,
        amountMinor: existing.amountMinor,
        isActive: existing.isActive,
        entitlements: existing.entitlements,
      },
      newValue: {
        displayName: plan.displayName,
        billingInterval: plan.billingInterval,
        amountMinor: plan.amountMinor,
        isActive: plan.isActive,
        entitlements: plan.entitlements,
      },
    });
    return plan;
  }

  async getByKey(key: string) {
    const plan = await this.platform.client.plan.findUnique({
      where: { key },
      include: { entitlements: true },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('PLAN_NOT_FOUND');
    return plan;
  }
}
