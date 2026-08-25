import { ForbiddenException, Injectable } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { PlatformPrismaService } from '../platform-prisma.service';

/**
 * Concrete entitlement gates used by tenant-plane services (MT-10 §13.2A).
 * Lives behind the optional-injection pattern so legacy deployments never
 * construct it.
 */
@Injectable()
export class PlanGateService {
  constructor(private readonly platform: PlatformPrismaService) {}

  async assertStaffSeat(organizationId: string, currentMemberCount: number): Promise<void> {
    // Delegates to the shared evaluator via a thin adapter object shape that
    // matches what services inject — keeps one evaluation code path.
    const decision = await this.evaluateStaffSeat(organizationId, currentMemberCount);
    if (!decision.allowed) {
      throw new ForbiddenException(decision.code ?? 'PLAN_LIMIT_REACHED');
    }
  }

  private async evaluateStaffSeat(organizationId: string, currentMemberCount: number) {
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
      include: { plan: { include: { entitlements: true } } },
    });
    if (!subscription) return { allowed: false, code: 'FEATURE_DISABLED' as const };
    if (!['TRIALING', 'ACTIVE'].includes(subscription.status)) {
      return { allowed: false, code: 'SUBSCRIPTION_INACTIVE' as const };
    }
    const seat = subscription.plan.entitlements.find((e) => e.featureKey === 'staff_seats');
    if (!seat || !seat.enabled) return { allowed: false, code: 'FEATURE_DISABLED' as const };
    if (seat.limit == null) return { allowed: true };
    if (currentMemberCount + 1 > seat.limit) {
      return {
        allowed: false,
        code: 'PLAN_LIMIT_REACHED' as const,
        limit: seat.limit,
        currentUsage: String(currentMemberCount),
      };
    }
    return { allowed: true, limit: seat.limit, currentUsage: String(currentMemberCount) };
  }
}
