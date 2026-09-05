import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '@app/database';
import { CommercePaymentsService } from '../services/commerce-payments.service';
import type { PaymentGatewayRegistry } from '../gateways/payment-gateway.registry';
import type { OrderService } from '../../order/order.service';
import type { AuditService } from '../../audit/services/audit.service';
import { AdminCommercePaymentsController } from '../controllers/commerce-payments.controller';

describe('CommercePaymentsService', () => {
  const transaction = {
    commercePaymentAttempt: {
      update: jest.fn(),
    },
    commercePaymentCallback: {
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  };
  const prisma = {
    order: {
      findUnique: jest.fn(),
    },
    commercePaymentAttempt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    commercePaymentCallback: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    checkoutDraft: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((input) =>
      typeof input === 'function' ? input(transaction) : Promise.all(input),
    ),
  };
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'PUBLIC_API_URL') return 'http://localhost:6733/api/v1';
      return fallback ?? '';
    }),
  };
  const orders = {
    preparePrepaidRetry: jest.fn(),
    confirmVerifiedPrepaidOrder: jest.fn(),
    expirePrepaidOrder: jest.fn(),
  };
  const mockGateway = {
    isConfigured: jest.fn().mockReturnValue(true),
    initiate: jest.fn().mockResolvedValue({
      redirectUrl: 'https://sandbox.sslcommerz.com/pay/session123',
      providerSessionId: 'session123',
      raw: { status: 'SUCCESS' },
    }),
    validate: jest.fn().mockResolvedValue({
      outcome: 'SUCCEEDED',
      merchantTransactionId: 'FERPAY123',
      amount: 150000,
      currency: 'BDT',
      providerTransactionId: 'SSL-BANK-999',
      validationId: 'VAL-999',
      riskLevel: '0',
      raw: { status: 'VALID' },
    }),
  };
  const gateways = {
    get: jest.fn().mockReturnValue(mockGateway),
    readiness: jest.fn(),
  };
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };

  const service = new CommercePaymentsService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    orders as unknown as OrderService,
    gateways as unknown as PaymentGatewayRegistry,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Admin payment operations read-only except recovery orchestration', () => {
    expect(
      Object.getOwnPropertyNames(AdminCommercePaymentsController.prototype)
        .filter((name) => name !== 'constructor')
        .sort(),
    ).toEqual(
      [
        'attempt',
        'attempts',
        'providers',
        'recoveryHealth',
        'recoverySweep',
      ].sort(),
    );
  });

  describe('Admin payment ledger', () => {
    it('applies payment and refund filters with pagination', async () => {
      prisma.commercePaymentAttempt.findMany.mockResolvedValueOnce([
        { id: 'attempt-1' },
      ]);
      prisma.commercePaymentAttempt.count.mockResolvedValueOnce(31);

      await expect(
        service.listAttempts({
          page: 2,
          limit: 30,
          provider: 'AAMARPAY',
          status: 'SUCCEEDED',
          paymentStatus: 'PARTIALLY_REFUNDED',
          refundStatus: 'PARTIAL',
          search: ' FER-1001 ',
        }),
      ).resolves.toEqual({
        items: [{ id: 'attempt-1' }],
        page: 2,
        limit: 30,
        total: 31,
        totalPages: 2,
      });
      expect(prisma.commercePaymentAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 30,
          where: expect.objectContaining({
            provider: 'AAMARPAY',
            status: 'SUCCEEDED',
            order: {
              paymentStatus: 'PARTIALLY_REFUNDED',
              refundStatus: 'PARTIAL',
            },
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('uses a payload-safe select for attempt drill-down', async () => {
      prisma.commercePaymentAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-1',
        callbacks: [],
        order: { refunds: [] },
      });

      await expect(service.attemptDetail('attempt-1')).resolves.toMatchObject({
        id: 'attempt-1',
      });
      const query =
        prisma.commercePaymentAttempt.findUnique.mock.calls.at(-1)?.[0];
      expect(query.select).toBeDefined();
      expect(query.select).not.toHaveProperty('initiationRequest');
      expect(query.select).not.toHaveProperty('initiationResponse');
      expect(query.select).not.toHaveProperty('validatedResponse');
      expect(query.select.callbacks.select).not.toHaveProperty('payload');
    });
  });

  describe('initiate', () => {
    it('throws ConflictException if payment gateway is not configured', async () => {
      mockGateway.isConfigured.mockReturnValueOnce(false);
      await expect(service.initiate('order-1', 'FER-1001', '+8801711111111', 'SSLCOMMERZ')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.initiate('order-1', 'FER-1001', '+8801711111111', 'SSLCOMMERZ')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if order is not PREPAID or is already PAID', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        reference: 'FER-1001',
        paymentMethod: 'COD',
        paymentStatus: 'UNPAID',
        address: { recipientName: 'John', phoneNormalized: '+8801711111111' },
        paymentAttempts: [],
      });
      await expect(service.initiate('order-1', 'FER-1001', '+8801711111111', 'SSLCOMMERZ')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates payment attempt and returns redirect URL on successful initiation', async () => {
      const order = {
        id: 'order-1',
        reference: 'FER-1001',
        total: 150000,
        currency: 'BDT',
        paymentMethod: 'PREPAID',
        paymentStatus: 'UNPAID',
        address: {
          recipientName: 'Customer Test',
          phoneNormalized: '+8801711111111',
          detailedAddress: 'House 1',
          area: 'Gulshan',
          district: 'Dhaka',
          email: 'test@ferio.com',
        },
        paymentAttempts: [],
      };
      prisma.order.findUnique.mockResolvedValueOnce(order);
      prisma.commercePaymentAttempt.create.mockResolvedValueOnce({
        id: 'attempt-1',
        merchantTransactionId: 'FERPAY123',
        status: 'INITIATING',
      });
      prisma.commercePaymentAttempt.update.mockResolvedValueOnce({
        id: 'attempt-1',
        merchantTransactionId: 'FERPAY123',
        provider: 'SSLCOMMERZ',
        status: 'PENDING',
        redirectUrl: 'https://sandbox.sslcommerz.com/pay/session123',
      });

      const result = await service.initiate('order-1', 'FER-1001', '+8801711111111', 'SSLCOMMERZ');

      expect(orders.preparePrepaidRetry).toHaveBeenCalled();
      expect(mockGateway.initiate).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantTransactionId: expect.any(String),
          amount: 150000,
          currency: 'BDT',
          orderReference: 'FER-1001',
        }),
      );
      expect(result).toMatchObject({
        provider: 'SSLCOMMERZ',
        status: 'PENDING',
        redirectUrl: 'https://sandbox.sslcommerz.com/pay/session123',
      });
    });
  });

  describe('processCallback', () => {
    it('ignores duplicate callbacks if already validated', async () => {
      prisma.commercePaymentCallback.findUnique.mockResolvedValueOnce({
        id: 'callback-1',
        status: 'VALIDATED',
      });
      const result = await service.processCallback('SSLCOMMERZ', 'SUCCESS', {
        val_id: 'VAL-999',
      });
      expect(result).toEqual({ duplicate: true });
    });

    it('validates payment callback and confirms order on SUCCEEDED outcome', async () => {
      prisma.commercePaymentCallback.findUnique.mockResolvedValueOnce(null);
      prisma.commercePaymentCallback.create.mockResolvedValueOnce({
        id: 'callback-1',
      });
      prisma.commercePaymentAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-1',
        merchantTransactionId: 'FERPAY123',
        provider: 'SSLCOMMERZ',
        status: 'PENDING',
        amount: 150000,
        currency: 'BDT',
        orderId: 'order-1',
        order: { paymentStatus: 'UNPAID' },
      });

      const result = await service.processCallback('SSLCOMMERZ', 'SUCCESS', {
        val_id: 'VAL-999',
        tran_id: 'FERPAY123',
      });

      expect(mockGateway.validate).toHaveBeenCalledWith({
        val_id: 'VAL-999',
        tran_id: 'FERPAY123',
      });
      expect(orders.confirmVerifiedPrepaidOrder).toHaveBeenCalledWith(
        transaction,
        'order-1',
      );
      expect(result).toEqual({ paid: true, orderId: 'order-1' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_PROVIDER_STATE_APPLIED',
          source: 'PROVIDER',
          entityId: 'order-1',
          newValue: expect.objectContaining({ paymentStatus: 'PAID' }),
        }),
        transaction,
      );
    });

    it('rejects callback if amount or currency does not match attempt', async () => {
      prisma.commercePaymentCallback.findUnique.mockResolvedValueOnce(null);
      prisma.commercePaymentCallback.create.mockResolvedValueOnce({
        id: 'callback-1',
      });
      prisma.commercePaymentAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-1',
        merchantTransactionId: 'FERPAY123',
        provider: 'SSLCOMMERZ',
        status: 'PENDING',
        amount: 200000, // Mismatched amount
        currency: 'BDT',
        orderId: 'order-1',
      });

      await expect(
        service.processCallback('SSLCOMMERZ', 'SUCCESS', {
          val_id: 'VAL-999',
          tran_id: 'FERPAY123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('audits a provider cancellation before marking the order failed', async () => {
      prisma.commercePaymentCallback.findUnique.mockResolvedValueOnce(null);
      prisma.commercePaymentCallback.create.mockResolvedValueOnce({
        id: 'callback-2',
      });
      prisma.commercePaymentAttempt.findUnique.mockResolvedValueOnce({
        id: 'attempt-2',
        merchantTransactionId: 'FERCANCEL123',
        provider: 'SSLCOMMERZ',
        status: 'PENDING',
        amount: 150000,
        currency: 'BDT',
        orderId: 'order-2',
        order: { paymentStatus: 'UNPAID' },
      });
      mockGateway.validate.mockResolvedValueOnce({
        outcome: 'CANCELLED',
        merchantTransactionId: 'FERCANCEL123',
        amount: 150000,
        currency: 'BDT',
        raw: { status: 'CANCELLED' },
      });

      await expect(
        service.processCallback('SSLCOMMERZ', 'cancel', {
          tran_id: 'FERCANCEL123',
        }),
      ).resolves.toEqual({
        paid: false,
        status: 'CANCELLED',
        orderId: 'order-2',
      });
      expect(transaction.order.update).toHaveBeenCalledWith({
        where: { id: 'order-2' },
        data: { paymentStatus: 'FAILED' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_PROVIDER_STATE_APPLIED',
          source: 'PROVIDER',
          entityId: 'order-2',
          newValue: expect.objectContaining({
            paymentStatus: 'FAILED',
            paymentAttemptStatus: 'CANCELLED',
          }),
        }),
        transaction,
      );
    });
  });
});
