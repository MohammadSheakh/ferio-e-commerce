import { PlatformAdminController } from '../platform.controller';

describe('PlatformAdminController dashboard boundaries', () => {
  it('returns control-plane aggregates without tenant PII', async () => {
    const platform = {
      client: {
        organization: {
          groupBy: jest
            .fn()
            .mockResolvedValue([{ status: 'ACTIVE', _count: { _all: 2 } }]),
        },
        subscription: {
          groupBy: jest
            .fn()
            .mockResolvedValue([{ status: 'ACTIVE', _count: { _all: 2 } }]),
        },
        tenantDatabase: {
          groupBy: jest
            .fn()
            .mockResolvedValue([{ status: 'READY', _count: { _all: 2 } }]),
        },
        provisioningRun: {
          count: jest.fn().mockResolvedValue(0),
        },
      },
    };
    const controller = new PlatformAdminController(
      {} as never,
      {} as never,
      {} as never,
      { countActive: jest.fn().mockResolvedValue(1) } as never,
      {} as never,
      platform as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(controller.dashboard()).resolves.toEqual({
      organizations: { ACTIVE: 2 },
      subscriptions: { ACTIVE: 2 },
      tenantDatabases: { READY: 2 },
      provisioningFailures: 0,
      activeSupportGrants: 1,
    });
    const dashboard = await controller.dashboard();
    expect(JSON.stringify(dashboard)).not.toMatch(
      /organizationId|email|phone|customer|order|tenantName/i,
    );
  });

  it('exposes system health only through the platform operations service', async () => {
    const health = { runtimeStatus: 'HEALTHY', alerts: [] };
    const operationsHealth = { getHealth: jest.fn().mockResolvedValue(health) };
    const controller = new PlatformAdminController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      operationsHealth as never,
    );

    await expect(controller.systemHealth()).resolves.toBe(health);
    expect(operationsHealth.getHealth).toHaveBeenCalledTimes(1);
  });
});
