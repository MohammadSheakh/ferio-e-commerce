import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePlanDto,
  StartTrialDto,
  TransitionSubscriptionDto,
} from './plan.dto';

describe('plan control-plane DTOs', () => {
  it('accepts a plan with nested entitlement contracts', async () => {
    const dto = plainToInstance(CreatePlanDto, {
      key: 'starter',
      displayName: 'Starter',
      billingInterval: 'MONTHLY',
      amountMinor: '99000',
      entitlements: [
        { featureKey: 'staff_seats', limit: '2' },
        { featureKey: 'custom_domain', enabled: true },
      ],
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.amountMinor).toBe(99000);
    expect(dto.entitlements[0].limit).toBe(2);
  });

  it('rejects invalid plan keys and malformed nested entitlements', async () => {
    const dto = plainToInstance(CreatePlanDto, {
      key: 'Starter Plan',
      displayName: 'Starter',
      entitlements: [{ featureKey: 'Invalid Feature', limit: -1 }],
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('key');
    expect(
      errors.find((error) => error.property === 'entitlements')?.children,
    ).toHaveLength(1);
  });

  it('bounds trial duration and validates subscription transitions', async () => {
    const trial = plainToInstance(StartTrialDto, {
      planKey: 'starter',
      trialDays: '14',
    });
    const transition = plainToInstance(TransitionSubscriptionDto, {
      status: 'SUSPENDED',
      note: 'Grace period has ended',
    });

    expect(await validate(trial)).toHaveLength(0);
    expect(trial.trialDays).toBe(14);
    expect(await validate(transition)).toHaveLength(0);
  });

  it('rejects unsupported subscription status and trial duration', async () => {
    const trial = plainToInstance(StartTrialDto, {
      planKey: 'starter',
      trialDays: 91,
    });
    const transition = plainToInstance(TransitionSubscriptionDto, {
      status: 'UNKNOWN',
    });

    expect((await validate(trial)).map((error) => error.property)).toContain(
      'trialDays',
    );
    expect(
      (await validate(transition)).map((error) => error.property),
    ).toContain('status');
  });
});
