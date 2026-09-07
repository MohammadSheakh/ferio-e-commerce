import { ForbiddenException } from '@nestjs/common';
import { PlanGateService } from './plan-gate.service';

describe('PlanGateService', () => {
  it('delegates staff seats to the shared entitlement evaluator', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      allowed: true,
      limit: 3,
      currentUsage: '2',
    });
    const service = new PlanGateService({ evaluate } as never);

    await expect(service.assertStaffSeat('org-1', 2)).resolves.toBeUndefined();
    expect(evaluate).toHaveBeenCalledWith('org-1', 'staff_seats', {
      currentOverride: 2,
    });
  });

  it('preserves stable denial codes from the shared evaluator', async () => {
    const service = new PlanGateService({
      evaluate: jest.fn().mockResolvedValue({
        allowed: false,
        code: 'PLAN_LIMIT_REACHED',
      }),
    } as never);

    await expect(service.assertStaffSeat('org-1', 3)).rejects.toEqual(
      new ForbiddenException('PLAN_LIMIT_REACHED'),
    );
  });
});
