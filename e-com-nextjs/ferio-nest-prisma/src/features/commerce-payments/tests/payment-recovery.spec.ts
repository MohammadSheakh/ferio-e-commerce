import { CommercePaymentsService } from '../commerce-payments.service';
import { PaymentRecoveryProcessor } from '../payment-recovery.processor';
import {
  PAYMENT_EXPIRY_JOB,
  PAYMENT_EXPIRY_SWEEP_JOB,
} from '../payment-recovery.queue';

describe('payment expiry recovery', () => {
  it('claims an expired attempt and releases the order through one transaction', async () => {
    const transaction = {
      commercePaymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'attempt-1',
          orderId: 'order-1',
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 1000),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const orders = {
      expirePrepaidOrder: jest.fn().mockResolvedValue(undefined),
    };
    const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const service = new CommercePaymentsService(
      prisma as never,
      {} as never,
      orders as never,
      {} as never,
      audit as never,
    );

    await expect(service.expireAttempt('attempt-1')).resolves.toMatchObject({
      status: 'EXPIRED',
      orderId: 'order-1',
    });
    expect(orders.expirePrepaidOrder).toHaveBeenCalledWith(
      transaction,
      'order-1',
    );
    expect(transaction.commercePaymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_ATTEMPT_EXPIRED',
        source: 'SYSTEM',
        entityId: 'attempt-1',
      }),
      transaction,
    );
  });

  it('routes sweep and attempt jobs to their dedicated handlers', async () => {
    const payments = {
      expireAttempt: jest.fn().mockResolvedValue({ status: 'EXPIRED' }),
    };
    const recovery = {
      enqueueDue: jest.fn().mockResolvedValue({ queuedCount: 1 }),
    };
    const processor = new PaymentRecoveryProcessor(
      payments as never,
      recovery as never,
    );

    await processor.process({
      name: PAYMENT_EXPIRY_SWEEP_JOB,
      data: {},
    } as never);
    await processor.process({
      name: PAYMENT_EXPIRY_JOB,
      data: { attemptId: 'attempt-1' },
    } as never);

    expect(recovery.enqueueDue).toHaveBeenCalledTimes(1);
    expect(payments.expireAttempt).toHaveBeenCalledWith('attempt-1');
  });
});
