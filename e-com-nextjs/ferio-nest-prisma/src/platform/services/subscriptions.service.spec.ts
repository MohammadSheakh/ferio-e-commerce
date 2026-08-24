import { ConflictException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService lifecycle state machine', () => {
  let service: SubscriptionsService;
  let platform: { client: any };
  let audit: { record: jest.Mock };

  const subscription = (status: string) => ({
    id: 'sub-1',
    organizationId: 'org-1',
    planId: 'plan-1',
    status,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    plan: { id: 'plan-1', entitlements: [] },
  });

  beforeEach(() => {
    platform = {
      client: {
        subscription: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn().mockImplementation((_args) =>
            Promise.resolve(subscription('ACTIVE')),
          ),
        },
        subscriptionEvent: { create: jest.fn() },
        plan: { findUnique: jest.fn() },
        $transaction: jest.fn(async (fn) => fn(platform.client)),
      },
    };
    audit = { record: jest.fn().mockResolvedValue({}) };
    service = new SubscriptionsService(platform as never, audit as never);
  });

  function mockCurrent(status: string) {
    platform.client.subscription.findUnique.mockResolvedValue(subscription(status));
  }

  it.each([
    ['TRIALING', 'ACTIVE', true],
    ['TRIALING', 'SUSPENDED', false],
    ['ACTIVE', 'PAST_DUE', true],
    ['PAST_DUE', 'ACTIVE', true],
    ['PAST_DUE', 'SUSPENDED', true],
    ['SUSPENDED', 'ACTIVE', true],
    ['CANCELLED', 'ACTIVE', true],
    ['CANCELLED', 'SUSPENDED', false],
  ])('%s -> %s is %s', async (from, to, allowed) => {
    mockCurrent(from);

    const attempt = service.transition('org-1', to as never, { note: 'test' });
    if (allowed) {
      await expect(attempt).resolves.toBeDefined();
      expect(platform.client.subscriptionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fromStatus: from, toStatus: to }),
        }),
      );
      expect(audit.record).toHaveBeenCalled();
    } else {
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('changePlan swaps plans without touching data and audits the move', async () => {
    mockCurrent('ACTIVE');
    platform.client.plan.findUnique.mockResolvedValue({ id: 'plan-2', key: 'pro', isActive: true });
    platform.client.subscription.update.mockResolvedValueOnce(subscription('ACTIVE'));

    await service.changePlan('org-1', 'pro', 'admin-1');

    expect(platform.client.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { planId: 'plan-2' } }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBSCRIPTION_PLAN_CHANGED',
        newValue: expect.objectContaining({ planKey: 'pro' }),
      }),
    );
  });
});
