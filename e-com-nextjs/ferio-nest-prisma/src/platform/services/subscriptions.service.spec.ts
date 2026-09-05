import { ConflictException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

type SubscriptionsPlatform = {
  client: {
    subscription: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    subscriptionEvent: { create: jest.Mock; findFirst: jest.Mock };
    plan: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
};

function firstCallInput<T>(mock: jest.Mock): T {
  const call = mock.mock.calls[0] as unknown as [T] | undefined;
  if (!call) throw new Error('Expected mock call');
  return call[0];
}

describe('SubscriptionsService lifecycle state machine', () => {
  let service: SubscriptionsService;
  let platform: SubscriptionsPlatform;
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
          update: jest.fn().mockResolvedValue(subscription('ACTIVE')),
        },
        subscriptionEvent: {
          create: jest.fn(),
          // Default: latest PAST_DUE happened 8 days ago — outside the
          // 7-day grace window, so matrix transitions proceed.
          findFirst: jest.fn().mockResolvedValue({
            createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          }),
        },
        plan: { findUnique: jest.fn() },
        $transaction: jest.fn(
          (fn: (client: SubscriptionsPlatform['client']) => unknown) =>
            Promise.resolve(fn(platform.client)),
        ),
      },
    };
    audit = { record: jest.fn().mockResolvedValue({}) };
    service = new SubscriptionsService(platform as never, audit as never);
  });

  function mockCurrent(status: string) {
    platform.client.subscription.findUnique.mockResolvedValue(
      subscription(status),
    );
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
      expect(
        firstCallInput<{ data: { fromStatus: string; toStatus: string } }>(
          platform.client.subscriptionEvent.create,
        ),
      ).toMatchObject({ data: { fromStatus: from, toStatus: to } });
      expect(audit.record).toHaveBeenCalled();
    } else {
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('blocks suspension inside the 7-day grace window (PO-004)', async () => {
    mockCurrent('PAST_DUE');
    platform.client.subscriptionEvent.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });

    await expect(
      service.transition('org-1', 'SUSPENDED', { note: 'too early' }),
    ).rejects.toMatchObject({ message: 'SUBSCRIPTION_GRACE_PERIOD_ACTIVE' });
    expect(platform.client.subscription.update).not.toHaveBeenCalled();
  });

  it('allows operator override of the grace window with explicit flag', async () => {
    mockCurrent('PAST_DUE');
    platform.client.subscriptionEvent.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    await expect(
      service.transition('org-1', 'SUSPENDED', {
        note: 'operator override',
        overrideGracePeriod: true,
      }),
    ).resolves.toBeDefined();
  });

  it('changePlan swaps plans without touching data and audits the move', async () => {
    mockCurrent('ACTIVE');
    platform.client.plan.findUnique.mockResolvedValue({
      id: 'plan-2',
      key: 'pro',
      isActive: true,
    });
    platform.client.subscription.update.mockResolvedValueOnce(
      subscription('ACTIVE'),
    );

    await service.changePlan('org-1', 'pro', 'admin-1');

    expect(
      firstCallInput<{ data: { planId: string } }>(
        platform.client.subscription.update,
      ),
    ).toMatchObject({ data: { planId: 'plan-2' } });
    expect(audit.record).toHaveBeenCalled();
  });
});
