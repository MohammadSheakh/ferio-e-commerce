import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../audit/audit.service';
import type { CustomerNotificationsService } from '../customer-notifications/customer-notifications.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  const transaction = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    walletTopUp: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletTransactionHistory: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const audit = {
    record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };
  const notifications = {
    create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
  };
  const service = new WalletService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    notifications as unknown as CustomerNotificationsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the existing order debit for an idempotent retry', async () => {
    const existing = { id: 'ledger-1' };
    transaction.walletTransactionHistory.findUnique.mockResolvedValueOnce(existing);

    await expect(
      service.debitOrder(transaction as never, 'user-1', 'order-1', 5_000),
    ).resolves.toBe(existing);
    expect(transaction.wallet.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an order debit when the available balance is insufficient', async () => {
    transaction.walletTransactionHistory.findUnique.mockResolvedValueOnce(null);
    transaction.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: 'user',
      isDeleted: false,
      walletId: 'wallet-1',
    });
    transaction.wallet.findUnique.mockResolvedValueOnce({
      id: 'wallet-1',
      amount: 4_999,
      status: 'active',
      isDeleted: false,
    });
    transaction.wallet.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.debitOrder(transaction as never, 'user-1', 'order-1', 5_000),
    ).rejects.toThrow(ConflictException);
    expect(transaction.walletTransactionHistory.create).not.toHaveBeenCalled();
  });

  it('atomically debits the wallet and records the immutable order ledger', async () => {
    transaction.walletTransactionHistory.findUnique.mockResolvedValueOnce(null);
    transaction.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: 'user',
      isDeleted: false,
      walletId: 'wallet-1',
    });
    transaction.wallet.findUnique.mockResolvedValueOnce({
      id: 'wallet-1',
      amount: 10_000,
      status: 'active',
      isDeleted: false,
    });
    transaction.wallet.updateMany.mockResolvedValueOnce({ count: 1 });
    (transaction.wallet as any).findUniqueOrThrow = jest.fn().mockResolvedValueOnce({
      amount: 5_000,
    });
    transaction.walletTransactionHistory.create.mockResolvedValueOnce({
      id: 'ledger-1',
    });

    await service.debitOrder(transaction as never, 'user-1', 'order-1', 5_000);

    expect(transaction.wallet.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wallet-1',
        amount: { gte: 5_000 },
        status: 'active',
      },
      data: { amount: { decrement: 5_000 } },
    });
    expect(transaction.walletTransactionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: 'order:order-1:debit',
        balanceBefore: 10_000,
        balanceAfter: 5_000,
        referenceFor: 'OrderPurchase',
      }),
    });
  });

  it('credits an approved top-up once and notifies the customer', async () => {
    transaction.walletTopUp.findUnique.mockResolvedValueOnce({
      id: 'topup-1',
      userId: 'user-1',
      walletId: 'wallet-1',
      provider: 'BKASH',
      amount: 25_000,
      status: 'PENDING_REVIEW',
      wallet: { amount: 10_000 },
    });
    transaction.walletTopUp.update.mockResolvedValueOnce({
      id: 'topup-1',
      userId: 'user-1',
      amount: 25_000,
      status: 'COMPLETED',
      reviewNote: 'Verified against provider statement',
    });
    transaction.wallet.update.mockResolvedValueOnce({
      id: 'wallet-1',
      amount: 35_000,
    });

    await service.reviewTopUp(
      'topup-1',
      { status: 'COMPLETED', reviewNote: 'Verified against provider statement' },
      { userId: 'admin-1', role: 'admin' } as never,
    );

    expect(transaction.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: {
        amount: { increment: 25_000 },
        totalBalance: { increment: 25_000 },
      },
    });
    expect(transaction.walletTransactionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: 'topup:topup-1:credit',
        balanceBefore: 10_000,
        balanceAfter: 35_000,
        referenceFor: 'WalletTopUp',
      }),
    });
    expect(audit.record).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deduplicationKey: 'wallet-top-up:topup-1:COMPLETED',
        type: 'wallet',
      }),
    );
  });
});
