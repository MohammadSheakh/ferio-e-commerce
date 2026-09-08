import { ForbiddenException, Injectable } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';

/**
 * Concrete entitlement gates used by tenant-plane services (MT-10 §13.2A).
 * Lives behind the optional-injection pattern so legacy deployments never
 * construct it.
 */
@Injectable()
export class PlanGateService {
  constructor(private readonly entitlements: EntitlementsService) {}

  async assertStaffSeat(
    organizationId: string,
    currentMemberCount: number,
  ): Promise<void> {
    const decision = await this.entitlements.evaluate(
      organizationId,
      'staff_seats',
      { currentOverride: currentMemberCount },
    );
    if (!decision.allowed) {
      throw new ForbiddenException(decision.code ?? 'PLAN_LIMIT_REACHED');
    }
  }
}
