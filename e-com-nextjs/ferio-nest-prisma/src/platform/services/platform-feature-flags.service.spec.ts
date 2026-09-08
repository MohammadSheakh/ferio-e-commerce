import { ConflictException } from '@nestjs/common';
import { PlatformFeatureFlagsService } from './platform-feature-flags.service';

describe('PlatformFeatureFlagsService', () => {
  function build() {
    const platform = {
      client: {
        platformFeatureFlag: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest
            .fn()
            .mockImplementation(({ create }) =>
              Promise.resolve({ id: 'flag-1', ...create }),
            ),
        },
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new PlatformFeatureFlagsService(
      platform as never,
      audit as never,
    );
    return { service, platform, audit };
  }

  it('normalizes and creates a platform-only flag with an audit record', async () => {
    const { service, platform, audit } = build();

    await service.upsert({
      key: ' Checkout.New-Flow ',
      enabled: true,
      note: '  staged rollout  ',
      actorId: 'platform-user-1',
    });

    expect(platform.client.platformFeatureFlag.upsert).toHaveBeenCalledWith({
      where: { key: 'checkout.new-flow' },
      create: {
        key: 'checkout.new-flow',
        enabled: true,
        note: 'staged rollout',
      },
      update: { enabled: true, note: 'staged rollout' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PLATFORM_FEATURE_FLAG_CREATED',
        entityType: 'PlatformFeatureFlag',
        actorId: 'platform-user-1',
      }),
    );
  });

  it('records updates separately from creation', async () => {
    const { service, platform, audit } = build();
    platform.client.platformFeatureFlag.findUnique.mockResolvedValue({
      id: 'flag-1',
      key: 'checkout.new-flow',
      enabled: true,
      note: null,
    });

    await service.upsert({ key: 'checkout.new-flow', enabled: false });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_FEATURE_FLAG_UPDATED' }),
    );
  });

  it('rejects keys that could escape the platform flag namespace', async () => {
    const { service, platform } = build();

    await expect(
      service.upsert({ key: 'Checkout New Flow', enabled: true }),
    ).rejects.toThrow(
      new ConflictException('PLATFORM_FEATURE_FLAG_KEY_INVALID'),
    );
    expect(platform.client.platformFeatureFlag.upsert).not.toHaveBeenCalled();
  });
});
