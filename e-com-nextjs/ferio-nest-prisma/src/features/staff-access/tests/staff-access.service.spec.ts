import { BadRequestException } from '@nestjs/common';
import { PERMISSIONS } from '@app/common';
import { StaffAccessService } from '../staff-access.service';

describe('StaffAccessService', () => {
  const actor = {
    userId: 'admin-1',
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
  };

  function createService() {
    const transaction = {
      user: { create: jest.fn(), update: jest.fn() },
      staffAccessToken: { update: jest.fn(), updateMany: jest.fn() },
    };
    type TransactionOperation = (value: typeof transaction) => Promise<unknown>;
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      staffAccessToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((operation: TransactionOperation) =>
        operation(transaction),
      ),
    };
    const audit = { record: jest.fn() };
    const email = { sendStaffAccessEmail: jest.fn() };
    const config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    };
    return {
      service: new StaffAccessService(
        prisma as never,
        audit as never,
        email as never,
        config as never,
      ),
      prisma,
      transaction,
      audit,
      email,
    };
  }

  it('stores only a token hash when inviting staff', async () => {
    const { service, prisma, email } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.staffAccessToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.staffAccessToken.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'invite-1', ...data, createdAt: new Date() }),
    );

    await service.invite(
      {
        name: ' Support Agent ',
        email: 'AGENT@EXAMPLE.COM',
        permissions: [PERMISSIONS.ORDERS_READ],
      },
      actor,
    );

    const emailCall = (email.sendStaffAccessEmail.mock.calls as unknown[][])[0];
    const rawToken = emailCall?.[1] as string;
    const createCall = (
      prisma.staffAccessToken.create.mock.calls as unknown[][]
    )[0]?.[0] as { data: { tokenHash: string; email: string } };
    const stored = createCall.data;
    expect(rawToken).toHaveLength(43);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(stored.email).toBe('agent@example.com');
  });

  it('atomically consumes an invitation before creating staff', async () => {
    const { service, prisma, transaction } = createService();
    prisma.staffAccessToken.findUnique.mockResolvedValue({
      id: 'invite-1',
      email: 'agent@example.com',
      name: 'Agent',
      permissions: [PERMISSIONS.ORDERS_READ],
      purpose: 'INVITE',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    transaction.staffAccessToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.create.mockResolvedValue({ id: 'staff-1' });

    await service.acceptInvite('raw-token', 'strong-password');

    const consumeCall = (
      transaction.staffAccessToken.updateMany.mock.calls as unknown[][]
    )[0]?.[0] as { where: { id: string; consumedAt: null } };
    expect(consumeCall.where.id).toBe('invite-1');
    expect(consumeCall.where.consumedAt).toBeNull();
    const userCreateCall = (
      transaction.user.create.mock.calls as unknown[][]
    )[0]?.[0] as {
      data: {
        role: string;
        staffAccessStatus: string;
        staffPermissions: string[];
      };
    };
    expect(userCreateCall.data).toMatchObject({
      role: 'staff',
      staffAccessStatus: 'active',
      staffPermissions: [PERMISSIONS.ORDERS_READ],
    });
  });

  it('rejects a token lost to a concurrent consumer', async () => {
    const { service, prisma, transaction } = createService();
    prisma.staffAccessToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      targetUserId: 'staff-1',
      purpose: 'RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    transaction.staffAccessToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.completeReset('raw-token', 'strong-password'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('prevents administrators from deactivating themselves', async () => {
    const { service, prisma } = createService();

    await expect(service.deactivate('admin-1', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates permissions and revokes existing staff sessions', async () => {
    const { service, prisma, audit } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      name: 'Agent',
      email: 'agent@example.com',
      staffAccessStatus: 'active',
      staffPermissions: [PERMISSIONS.ORDERS_READ],
    });
    prisma.user.update.mockResolvedValue({
      id: 'staff-1',
      name: 'Agent',
      email: 'agent@example.com',
      role: 'staff',
      staffAccessStatus: 'inactive',
      staffPermissions: [PERMISSIONS.CUSTOMERS_READ],
    });

    await service.updateAccess(
      'staff-1',
      {
        status: 'inactive',
        permissions: [PERMISSIONS.CUSTOMERS_READ],
      },
      actor,
    );

    const updateCall = (
      prisma.user.update.mock.calls as unknown[][]
    )[0]?.[0] as {
      data: {
        staffAccessStatus: string;
        staffPermissions: string[];
        staffSessionVersion: { increment: number };
      };
    };
    expect(updateCall.data.staffAccessStatus).toBe('inactive');
    expect(updateCall.data.staffPermissions).toEqual([
      PERMISSIONS.CUSTOMERS_READ,
    ]);
    expect(updateCall.data.staffSessionVersion).toEqual({ increment: 1 });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STAFF_ACCESS_UPDATED' }),
    );
  });
});
