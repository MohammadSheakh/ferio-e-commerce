import { EntitlementsService } from './entitlements.service';

type EntitlementsPlatform = {
  client: { subscription: { findUnique: jest.Mock } };
};

describe('EntitlementsService evaluation matrix (ADR-0006)', () => {
  let service: EntitlementsService;
  let platform: EntitlementsPlatform;
  const usage = { getValue: jest.fn() };

  function mockSubscription(plan: {
    status: string;
    entitlements: Array<{
      featureKey: string;
      enabled: boolean;
      limit?: number | null;
    }>;
  }) {
    platform.client.subscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      status: plan.status,
      plan: { entitlements: plan.entitlements },
    });
  }

  beforeEach(() => {
    platform = { client: { subscription: { findUnique: jest.fn() } } };
    usage.getValue.mockResolvedValue(BigInt(0));
    service = new EntitlementsService(platform as never, usage);
  });

  it('denies when no subscription exists', async () => {
    platform.client.subscription.findUnique.mockResolvedValue(null);
    expect(await service.evaluate('org', 'custom_domain')).toMatchObject({
      allowed: false,
      code: 'ENTITLEMENT_NOT_FOUND',
    });
  });

  it.each([
    ['SUSPENDED', 'SUBSCRIPTION_INACTIVE'],
    ['PAST_DUE', 'SUBSCRIPTION_INACTIVE'],
    ['CANCELLED', 'SUBSCRIPTION_INACTIVE'],
  ])('%s subscription blocks features with %s', async (status, code) => {
    mockSubscription({
      status,
      entitlements: [{ featureKey: 'x', enabled: true }],
    });
    expect(await service.evaluate('org', 'x')).toMatchObject({
      allowed: false,
      code,
    });
  });

  it('allows trialing subscriptions like active ones', async () => {
    mockSubscription({
      status: 'TRIALING',
      entitlements: [{ featureKey: 'x', enabled: true }],
    });
    expect((await service.evaluate('org', 'x')).allowed).toBe(true);
  });

  it('denies unknown and disabled features with FEATURE_DISABLED', async () => {
    mockSubscription({
      status: 'ACTIVE',
      entitlements: [{ featureKey: 'known', enabled: false }],
    });
    expect(await service.evaluate('org', 'unknown')).toMatchObject({
      allowed: false,
      code: 'FEATURE_DISABLED',
    });
    expect(await service.evaluate('org', 'known')).toMatchObject({
      allowed: false,
      code: 'FEATURE_DISABLED',
    });
  });

  it('boolean entitlements allow without consulting usage', async () => {
    mockSubscription({
      status: 'ACTIVE',
      entitlements: [
        { featureKey: 'custom_domain', enabled: true, limit: null },
      ],
    });
    expect(await service.evaluate('org', 'custom_domain')).toEqual({
      allowed: true,
    });
    expect(usage.getValue).not.toHaveBeenCalled();
  });

  it('enforces limits concurrently-safe against current usage', async () => {
    mockSubscription({
      status: 'ACTIVE',
      entitlements: [{ featureKey: 'staff_seats', enabled: true, limit: 3 }],
    });
    usage.getValue.mockResolvedValue(BigInt(2));

    expect(
      await service.evaluate('org', 'staff_seats', { requestedCount: 1 }),
    ).toMatchObject({ allowed: true, limit: 3, currentUsage: '2' });
    expect(
      await service.evaluate('org', 'staff_seats', { requestedCount: 2 }),
    ).toMatchObject({ allowed: false, code: 'PLAN_LIMIT_REACHED' });
  });
});
