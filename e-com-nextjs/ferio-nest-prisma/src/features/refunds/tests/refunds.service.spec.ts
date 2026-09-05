import { BadRequestException, ConflictException } from '@nestjs/common';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/services/audit.service';
import { RefundsService } from '../services/refunds.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;
const eligibilityCase = {
  id: 'return-1',
  status: 'INSPECTED',
  finalResolution: 'REFUND',
  order: {
    id: 'order-1',
    currency: 'BDT',
    paymentMethod: 'COD',
  },
  items: [
    {
      acceptedQuantity: 1,
      orderItem: { lineTotal: 2000, quantity: 2 },
    },
  ],
  refunds: [],
};

describe('RefundsService', () => {
  const createdRefund = {
    id: 'refund-1',
    reference: 'RF-260811-ABC123',
    orderId: 'order-1',
    returnCaseId: 'return-1',
    status: 'PENDING',
    amount: 1000,
    attempts: [],
  };
  const transaction = {
    returnCase: { findUnique: jest.fn() },
    commerceRefund: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refundAttempt: { findUnique: jest.fn(), create: jest.fn() },
    order: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    commerceRefund: { findUnique: jest.fn(), findMany: jest.fn() },
    returnCase: { findUnique: jest.fn() },
    $transaction: jest.fn(
      (callback: (tx: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new RefundsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.commerceRefund.findUnique.mockResolvedValue(null);
    transaction.commerceRefund.findUnique.mockResolvedValue(null);
    transaction.returnCase.findUnique.mockResolvedValue(eligibilityCase);
    transaction.commerceRefund.create.mockResolvedValue(createdRefund);
    transaction.order.update.mockResolvedValue({});
    audit.record.mockResolvedValue({});
  });

  it('creates one bounded instruction and records its actor', async () => {
    await expect(
      service.create(
        'return-1',
        'create-refund-key-0001',
        { amount: 1000, method: 'BKASH', reason: 'Accepted item' },
        actor,
      ),
    ).resolves.toBe(createdRefund);

    expect(transaction.commerceRefund.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          returnCaseId: 'return-1',
          amount: 1000,
          createdByActorId: 'admin-1',
        }),
      }),
    );
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { refundStatus: 'PENDING' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REFUND_CREATED', actor }),
      transaction,
    );
  });

  it('rejects over-refunds and original-payment refunds for COD', async () => {
    await expect(
      service.create(
        'return-1',
        'create-refund-key-0002',
        { amount: 1001, method: 'BKASH', reason: 'Too much' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.create(
        'return-1',
        'create-refund-key-0003',
        {
          amount: 1000,
          method: 'ORIGINAL_PAYMENT',
          reason: 'Invalid COD route',
          sourcePaymentReference: 'payment-1',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.commerceRefund.create).not.toHaveBeenCalled();
  });

  it('records a referenced success attempt and synchronizes the order', async () => {
    transaction.refundAttempt.findUnique.mockResolvedValue(null);
    transaction.commerceRefund.findUnique.mockResolvedValue(createdRefund);
    transaction.refundAttempt.create.mockResolvedValue({});
    transaction.commerceRefund.update.mockResolvedValue({});
    transaction.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order-1',
      total: 1000,
      paymentStatus: 'PAID',
    });
    transaction.commerceRefund.findMany.mockResolvedValue([
      { amount: 1000, status: 'SUCCEEDED' },
    ]);
    transaction.commerceRefund.findUniqueOrThrow.mockResolvedValue({
      ...createdRefund,
      status: 'SUCCEEDED',
      attempts: [{ id: 'attempt-1', outcome: 'SUCCEEDED' }],
    });

    await service.recordResult(
      'refund-1',
      'refund-result-key-0001',
      {
        executionMode: 'MANUAL',
        outcome: 'SUCCEEDED',
        externalReference: 'receipt-1001',
      },
      actor,
    );

    expect(transaction.refundAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        refundId: 'refund-1',
        attemptNumber: 1,
        outcome: 'SUCCEEDED',
        externalReference: 'receipt-1001',
        actorId: 'admin-1',
      }),
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { refundStatus: 'REFUNDED', paymentStatus: 'REFUNDED' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REFUND_RESULT_RECORDED' }),
      transaction,
    );
  });

  it('requires evidence for successful settlement', async () => {
    transaction.refundAttempt.findUnique.mockResolvedValue(null);
    transaction.commerceRefund.findUnique.mockResolvedValue(createdRefund);
    await expect(
      service.recordResult(
        'refund-1',
        'refund-result-key-0002',
        { executionMode: 'MANUAL', outcome: 'SUCCEEDED' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.refundAttempt.create).not.toHaveBeenCalled();
  });
});
