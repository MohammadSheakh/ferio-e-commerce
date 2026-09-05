import { TwoFactorService } from '../two-factor.service';

type TwoFactorUpdateData = {
  twoFactorPendingEncrypted?: string;
  twoFactorEnabled?: boolean;
  twoFactorRecoveryCodeHashes?: string[];
  staffSessionVersion?: { increment: number };
};

function updateData(
  prisma: { user: { update: jest.Mock } },
  index: number,
): TwoFactorUpdateData {
  const call = prisma.user.update.mock.calls[index] as unknown as [
    { data: TwoFactorUpdateData },
  ];
  return call[0].data;
}

describe('TwoFactorService', () => {
  function setup() {
    const prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'TWO_FACTOR_ENCRYPTION_KEY'
          ? 'test-encryption-key-with-32-characters-minimum'
          : fallback,
      ),
    };
    return {
      service: new TwoFactorService(prisma as never, config as never),
      prisma,
    };
  }

  it('stores an encrypted pending secret and returns an authenticator URI', async () => {
    const { service, prisma } = setup();
    prisma.user.update.mockResolvedValue({});

    const result = await service.beginEnrollment(
      'admin-1',
      'admin@example.com',
    );
    const encrypted = updateData(prisma, 0).twoFactorPendingEncrypted ?? '';

    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(result.uri).toContain('otpauth://totp/');
    expect(result.uri).toContain(`secret=${result.secret}`);
    expect(encrypted).not.toContain(result.secret);
    expect(encrypted.split('.')).toHaveLength(3);
  });

  it('accepts a valid TOTP and stores only hashed recovery codes', async () => {
    const { service, prisma } = setup();
    prisma.user.update.mockResolvedValue({});
    const enrollment = await service.beginEnrollment(
      'admin-1',
      'admin@example.com',
    );
    const encrypted = updateData(prisma, 0).twoFactorPendingEncrypted ?? '';
    prisma.user.findUnique.mockResolvedValue({
      twoFactorPendingEncrypted: encrypted,
    });
    const internals = service as unknown as {
      totp(secret: string, counter: number): string;
    };
    const code = internals.totp(
      enrollment.secret,
      Math.floor(Date.now() / 30_000),
    );

    const result = await service.confirmEnrollment('admin-1', code);
    const stored = updateData(prisma, 1);

    expect(result.recoveryCodes).toHaveLength(8);
    expect(stored.twoFactorEnabled).toBe(true);
    expect(stored.twoFactorRecoveryCodeHashes).toHaveLength(8);
    expect(stored.twoFactorRecoveryCodeHashes[0]).not.toBe(
      result.recoveryCodes[0],
    );
    expect(stored.staffSessionVersion).toEqual({ increment: 1 });
  });
});
