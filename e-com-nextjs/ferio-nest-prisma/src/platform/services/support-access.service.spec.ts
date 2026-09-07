import { ConflictException, NotFoundException } from '@nestjs/common';
import { SupportAccessService } from './support-access.service';

type Grant = {
  id: string;
  organizationId: string;
  platformUserId: string;
  reason: string;
  scope: unknown;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

type PlatformDouble = {
  supportAccessGrant: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
};

function build() {
  const platform: PlatformDouble = {
    supportAccessGrant: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new SupportAccessService(
    { client: platform } as never,
    audit as never,
  );
  return { service, platform, audit };
}

function grant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: 'grant-1',
    organizationId: 'org-a',
    platformUserId: 'platform-1',
    reason: 'Investigate a reported tenant incident',
    scope: {},
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SupportAccessService (explicit, scoped, time-bound access)', () => {
  it('rejects a short reason before creating a grant', async () => {
    const { service, platform } = build();

    await expect(
      service.grant({
        organizationId: 'org-a',
        platformUserId: 'platform-1',
        reason: 'too short',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(platform.supportAccessGrant.create).not.toHaveBeenCalled();
  });

  it('creates an auditable grant with a clamped TTL and requested scope', async () => {
    const { service, platform, audit } = build();
    const created = grant();
    platform.supportAccessGrant.create.mockResolvedValue(created);

    const result = await service.grant({
      organizationId: 'org-a',
      platformUserId: 'platform-1',
      reason: '  Investigate a reported tenant incident  ',
      scope: { orders: 'read' },
      ttlMinutes: 9999,
      actorId: 'operator-1',
    });

    expect(result).toBe(created);
    const createCall = platform.supportAccessGrant.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(createCall[0].data).toMatchObject({
      organizationId: 'org-a',
      platformUserId: 'platform-1',
      reason: 'Investigate a reported tenant incident',
      scope: { orders: 'read' },
    });
    expect(createCall[0].data.expiresAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUPPORT_ACCESS_GRANTED',
        actorId: 'operator-1',
      }),
    );
  });

  it('requires an unexpired, unrevoked grant for the exact organization and user', async () => {
    const { service, platform } = build();
    const active = grant();
    platform.supportAccessGrant.findFirst.mockResolvedValue(active);

    await expect(service.assertActive('org-a', 'platform-1')).resolves.toBe(
      active,
    );
    const dateMatcher = expect.any(Date) as unknown;
    expect(platform.supportAccessGrant.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-a',
        platformUserId: 'platform-1',
        revokedAt: null,
        expiresAt: { gt: dateMatcher },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it.each(['expired', 'revoked', 'wrong organization'])(
    'rejects an %s grant through the active lookup',
    async () => {
      const { service, platform } = build();
      platform.supportAccessGrant.findFirst.mockResolvedValue(null);

      await expect(
        service.assertActive('org-a', 'platform-1'),
      ).rejects.toMatchObject({
        message: 'SUPPORT_ACCESS_REQUIRED',
      } satisfies Partial<NotFoundException>);
    },
  );

  it('revokes once and does not duplicate audit events on replay', async () => {
    const { service, platform, audit } = build();
    const active = grant();
    const revoked = grant({ revokedAt: new Date() });
    platform.supportAccessGrant.findUnique
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(revoked);
    platform.supportAccessGrant.update.mockResolvedValue(revoked);

    await expect(service.revoke('grant-1', 'operator-1')).resolves.toBe(
      revoked,
    );
    await expect(service.revoke('grant-1', 'operator-1')).resolves.toBe(
      revoked,
    );
    expect(platform.supportAccessGrant.update).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('filters active listings by organization when requested', async () => {
    const { service, platform } = build();
    platform.supportAccessGrant.findMany.mockResolvedValue([]);

    await service.listActive('org-b');

    const dateMatcher = expect.any(Date) as unknown;
    expect(platform.supportAccessGrant.findMany).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        expiresAt: { gt: dateMatcher },
        organizationId: 'org-b',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });
});
