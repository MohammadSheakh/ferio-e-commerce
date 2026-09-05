import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/services/audit.service';
import { SettlementsService } from '../services/settlements.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;
const shipment = {
  id: 'shipment-1',
  orderId: 'order-1',
  status: 'DELIVERED',
  provider: { id: 'provider-1', code: 'STEADFAST' },
  order: { id: 'order-1', paymentMethod: 'COD', paymentStatus: 'UNPAID' },
  codCollection: { id: 'collection-1', expectedAmount: 150000 },
  settlementItem: null,
};
const dto = {
  provider: 'STEADFAST' as const,
  providerSettlementReference: 'steadfast-batch-1001',
  bankReference: 'bank-txn-1001',
  remittedAmount: 145000,
  settledAt: '2026-08-11T12:00:00.000Z',
  items: [
    {
      shipmentId: 'shipment-1',
      collectedAmount: 150000,
      courierFee: 5000,
      otherDeduction: 0,
    },
  ],
};

describe('SettlementsService', () => {
  const created = {
    id: 'settlement-1',
    status: 'MATCHED',
    grossCollected: 150000,
    expectedRemittance: 145000,
    remittedAmount: 145000,
    variance: 0,
    items: [],
  };
  const transaction = {
    courierSettlement: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    shipmentProvider: { findUnique: jest.fn() },
    shipment: { findMany: jest.fn() },
    codCollection: { update: jest.fn() },
    order: { update: jest.fn() },
  };
  const prisma = {
    courierSettlement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    courierSettlementItem: { findFirst: jest.fn() },
    codCollection: { findMany: jest.fn() },
    $transaction: jest.fn(
      (callback: (tx: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new SettlementsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    );
    prisma.courierSettlement.findUnique.mockResolvedValue(null);
    prisma.courierSettlement.findFirst.mockResolvedValue(null);
    prisma.courierSettlementItem.findFirst.mockResolvedValue(null);
    transaction.courierSettlement.findUnique.mockResolvedValue(null);
    transaction.shipmentProvider.findUnique.mockResolvedValue({
      id: 'provider-1',
      code: 'STEADFAST',
    });
    transaction.shipment.findMany.mockResolvedValue([shipment]);
    transaction.courierSettlement.create.mockResolvedValue(created);
    transaction.courierSettlement.findUniqueOrThrow.mockResolvedValue(created);
    transaction.codCollection.update.mockResolvedValue({});
    transaction.order.update.mockResolvedValue({});
    audit.record.mockResolvedValue({});
  });

  it('records a matched batch and marks evidenced COD as paid', async () => {
    await expect(
      service.create('settlement-create-key-0001', dto, actor),
    ).resolves.toBe(created);

    expect(transaction.courierSettlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'MATCHED',
          grossCollected: 150000,
          courierFees: 5000,
          expectedRemittance: 145000,
          remittedAmount: 145000,
          variance: 0,
          recordedByActorId: 'admin-1',
          items: {
            create: [
              expect.objectContaining({
                shipmentId: 'shipment-1',
                status: 'MATCHED',
                collectionVariance: 0,
              }),
            ],
          },
        }),
      }),
    );
    expect(transaction.codCollection.update).toHaveBeenCalledWith({
      where: { id: 'collection-1' },
      data: {
        status: 'SETTLED',
        collectedAmount: 150000,
        collectionVariance: 0,
        settledAt: new Date(dto.settledAt),
      },
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { paymentStatus: 'PAID' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COURIER_SETTLEMENT_RECORDED', actor }),
      transaction,
    );
  });

  it('keeps a collection shortfall visible without marking the order paid', async () => {
    transaction.courierSettlement.create.mockResolvedValue({
      ...created,
      status: 'VARIANCE',
    });
    await service.create(
      'settlement-create-key-0002',
      {
        ...dto,
        remittedAmount: 135000,
        items: [
          {
            ...dto.items[0],
            collectedAmount: 140000,
          },
        ],
      },
      actor,
    );

    expect(transaction.courierSettlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'VARIANCE',
          grossCollected: 140000,
          expectedRemittance: 135000,
          variance: 0,
        }),
      }),
    );
    expect(transaction.codCollection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'VARIANCE',
          collectionVariance: -10000,
        }),
      }),
    );
    expect(transaction.order.update).not.toHaveBeenCalled();
  });

  it('rejects fees and deductions above the collected amount', async () => {
    await expect(
      service.create(
        'settlement-create-key-0003',
        {
          ...dto,
          items: [
            {
              ...dto.items[0],
              collectedAmount: 1000,
              courierFee: 1001,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.courierSettlement.create).not.toHaveBeenCalled();
  });

  it('returns the original settlement for an idempotent replay', async () => {
    prisma.courierSettlement.findUnique.mockResolvedValue(created);
    await expect(
      service.create('settlement-create-key-0004', dto, actor),
    ).resolves.toBe(created);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the committed settlement after an idempotency race', async () => {
    prisma.courierSettlement.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    await expect(
      service.create('settlement-create-key-race-0001', dto, actor),
    ).resolves.toBe(created);
    expect(prisma.courierSettlementItem.findFirst).not.toHaveBeenCalled();
  });

  it('translates an overlapping shipment race into a domain conflict', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Transaction failed due to a write conflict',
        {
          code: 'P2034',
          clientVersion: '7.8.0',
        },
      ),
    );
    prisma.courierSettlementItem.findFirst.mockResolvedValue({
      shipmentId: 'shipment-1',
    });

    await expect(
      service.create('settlement-create-key-race-0002', dto, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.courierSettlementItem.findFirst).toHaveBeenCalledWith({
      where: { shipmentId: { in: ['shipment-1'] } },
      select: { shipmentId: true },
    });
  });
});
