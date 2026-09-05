import { BadRequestException, ConflictException } from '@nestjs/common';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/audit.service';
import { RtoService } from '../rto.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;
const rtoCase = {
  id: 'rto-1',
  orderId: 'order-1',
  status: 'AWAITING_RECEIPT',
  order: {
    id: 'order-1',
    status: 'CONFIRMED',
    fulfillmentStatus: 'HANDED_OVER',
  },
  items: [
    {
      id: 'rto-item-1',
      expectedQuantity: 3,
      reservationId: 'reservation-1',
      reservation: {
        id: 'reservation-1',
        status: 'ACTIVE',
        inventoryId: 'stock-1',
      },
    },
  ],
};

describe('RtoService', () => {
  const transaction = {
    rtoCase: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    rtoItem: { update: jest.fn() },
    inventoryStock: { findUnique: jest.fn(), update: jest.fn() },
    inventoryReservation: { update: jest.fn() },
    inventoryMovement: { create: jest.fn() },
    order: { update: jest.fn() },
    orderStatusHistory: { create: jest.fn() },
    fulfillmentHistory: { create: jest.fn() },
  };
  const prisma = {
    rtoCase: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const audit = { record: jest.fn() };
  const service = new RtoService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.rtoCase.findUnique.mockResolvedValue(rtoCase);
    transaction.rtoCase.findUniqueOrThrow.mockResolvedValue({
      ...rtoCase,
      status: 'INSPECTED',
    });
    transaction.inventoryStock.findUnique.mockResolvedValue({
      id: 'stock-1',
      onHand: 10,
      reserved: 3,
    });
    transaction.inventoryStock.update.mockResolvedValue({});
    transaction.inventoryReservation.update.mockResolvedValue({});
    transaction.inventoryMovement.create.mockResolvedValue({});
    transaction.rtoItem.update.mockResolvedValue({});
    transaction.rtoCase.update.mockResolvedValue({});
    transaction.order.update.mockResolvedValue({});
    transaction.orderStatusHistory.create.mockResolvedValue({});
    transaction.fulfillmentHistory.create.mockResolvedValue({});
    audit.record.mockResolvedValue({});
  });

  it('settles reserved stock across sellable, damaged, and lost units', async () => {
    await service.inspect(
      'rto-1',
      {
        reason: 'CUSTOMER_UNREACHABLE',
        reasonNote: 'Customer unreachable after three attempts',
        outboundCourierCost: 8000,
        returnCourierCost: 5000,
        otherCost: 1000,
        items: [
          {
            rtoItemId: 'rto-item-1',
            receivedQuantity: 2,
            sellableQuantity: 1,
            damagedQuantity: 1,
            lostQuantity: 1,
          },
        ],
      },
      actor,
    );

    expect(transaction.inventoryStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: {
        reserved: { decrement: 3 },
        onHand: { decrement: 1 },
        damaged: { increment: 1 },
      },
    });
    expect(transaction.inventoryReservation.update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: { status: 'RELEASED', releasedAt: expect.any(Date) },
    });
    expect(transaction.rtoCase.update).toHaveBeenCalledWith({
      where: { id: 'rto-1' },
      data: expect.objectContaining({
        status: 'INSPECTED',
        totalCost: 14000,
        inspectedByActorId: 'admin-1',
      }),
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'CANCELLED',
        fulfillmentStatus: 'CANCELLED',
        shipmentStatus: 'RTO',
        cancellationReason: 'RTO: Customer unreachable after three attempts',
        cancelledAt: expect.any(Date),
      },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RTO_CASE_INSPECTED', actor }),
      transaction,
    );
  });

  it('rejects quantities that do not reconcile before stock changes', async () => {
    await expect(
      service.inspect(
        'rto-1',
        {
          reason: 'OTHER',
          reasonNote: 'Parcel mismatch',
          outboundCourierCost: 0,
          returnCourierCost: 0,
          otherCost: 0,
          items: [
            {
              rtoItemId: 'rto-item-1',
              receivedQuantity: 2,
              sellableQuantity: 2,
              damagedQuantity: 0,
              lostQuantity: 0,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.inventoryStock.update).not.toHaveBeenCalled();
  });

  it('rejects receipt when the original reservation is no longer active', async () => {
    transaction.rtoCase.findUnique.mockResolvedValue({
      ...rtoCase,
      items: [
        {
          ...rtoCase.items[0],
          reservation: { ...rtoCase.items[0].reservation, status: 'RELEASED' },
        },
      ],
    });
    await expect(
      service.inspect(
        'rto-1',
        {
          reason: 'COURIER_ISSUE',
          reasonNote: 'Reservation already changed',
          outboundCourierCost: 0,
          returnCourierCost: 0,
          otherCost: 0,
          items: [
            {
              rtoItemId: 'rto-item-1',
              receivedQuantity: 3,
              sellableQuantity: 3,
              damagedQuantity: 0,
              lostQuantity: 0,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.inventoryStock.update).not.toHaveBeenCalled();
  });
});
