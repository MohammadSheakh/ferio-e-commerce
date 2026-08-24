import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PlatformPrismaService } from '../platform-prisma.service';
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
      where: { isActive: true },
      include: { entitlements: true },
      orderBy: { createdAt: 'asc' },
    });
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
