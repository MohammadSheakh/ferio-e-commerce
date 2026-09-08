import { ConflictException } from '@nestjs/common';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  function build() {
    const platform = {
      client: {
        plan: {
          create: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: 'plan-1', ...data }),
            ),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };
    const audit = { record: jest.fn() };
    const service = new PlansService(platform as never, audit as never);
    return { service, platform, audit };
  }

  it('normalizes and persists a valid plan with entitlements', async () => {
    const { service, platform } = build();

    await service.create({
      key: ' Starter ',
      displayName: ' Starter ',
      amountMinor: 99000,
      entitlements: [
        { featureKey: ' Staff_Seats ', limit: 2 },
        { featureKey: 'custom_domain', enabled: true },
      ],
    });

    const createCall = platform.client.plan.create.mock.calls[0] as unknown as [
      {
        data: {
          key: string;
          displayName: string;
          entitlements: {
            create: Array<{
              featureKey: string;
              enabled: boolean;
              limit: number | null;
            }>;
          };
        };
        include: { entitlements: true };
      },
    ];
    expect(createCall[0]).toEqual({
      data: {
        key: 'starter',
        displayName: 'Starter',
        billingInterval: 'MONTHLY',
        amountMinor: 99000,
        entitlements: {
          create: [
            { featureKey: 'staff_seats', enabled: true, limit: 2 },
            { featureKey: 'custom_domain', enabled: true, limit: null },
          ],
        },
      },
      include: { entitlements: true },
    });
  });

  it.each([
    ['PLAN_KEY_INVALID', { key: 'Starter Plan' }],
    ['PLAN_NAME_INVALID', { key: 'starter', displayName: ' ' }],
    ['PLAN_AMOUNT_INVALID', { key: 'starter', amountMinor: -1 }],
  ])('rejects invalid plan input with %s', async (code, overrides) => {
    const { service, platform } = build();

    await expect(
      service.create({
        displayName: 'Starter',
        entitlements: [{ featureKey: 'orders_per_month', limit: 100 }],
        ...overrides,
      }),
    ).rejects.toThrow(new ConflictException(code));
    expect(platform.client.plan.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate or invalid entitlement definitions', async () => {
    const { service, platform } = build();

    await expect(
      service.create({
        key: 'starter',
        displayName: 'Starter',
        entitlements: [
          { featureKey: 'orders_per_month', limit: 100 },
          { featureKey: 'ORDERS_PER_MONTH', limit: 200 },
        ],
      }),
    ).rejects.toThrow('PLAN_FEATURE_DUPLICATE');
    expect(platform.client.plan.create).not.toHaveBeenCalled();
  });

  it('increments the plan revision with the entitlement update', async () => {
    const { service, platform, audit } = build();
    const existing = {
      id: 'plan-1',
      displayName: 'Starter',
      billingInterval: 'MONTHLY',
      amountMinor: 99000,
      isActive: true,
      version: 1,
      entitlements: [{ featureKey: 'orders_per_month', enabled: true, limit: 100 }],
    };
    const updated = { ...existing, version: 2, displayName: 'Starter Plus' };
    platform.client.plan.findUnique.mockResolvedValue(existing);
    platform.client.$transaction.mockImplementation(
      async (callback: (transaction: typeof platform.client) => Promise<unknown>) =>
        callback({
          planEntitlement: { deleteMany: jest.fn() },
          plan: { update: jest.fn().mockResolvedValue(updated) },
        } as never),
    );

    await service.update('plan-1', {
      displayName: 'Starter Plus',
      entitlements: [{ featureKey: 'orders_per_month', limit: 200 }],
      actorId: 'platform-user-1',
    });

    const transaction = platform.client.$transaction.mock.calls[0]?.[0];
    expect(transaction).toBeDefined();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        previousValue: expect.objectContaining({ version: 1 }),
        newValue: expect.objectContaining({ version: 2 }),
      }),
    );
  });
});
