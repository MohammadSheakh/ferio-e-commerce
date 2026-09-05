import { BadRequestException } from '@nestjs/common';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/services/audit.service';
import { ReturnsService } from '../services/returns.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;
const existing = {
  id: 'return-1',
  orderId: 'order-1',
  status: 'REQUESTED',
  items: [
    { id: 'item-1', requestedQuantity: 2 },
    { id: 'item-2', requestedQuantity: 1 },
  ],
};

describe('ReturnsService review', () => {
  const updated = { ...existing, status: 'APPROVED' };
  const transaction = {
    returnCase: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    returnItem: { update: jest.fn() },
    returnStatusHistory: { create: jest.fn() },
    order: { update: jest.fn() },
    inventoryStock: { update: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (tx: typeof transaction) => unknown) =>
        Promise.resolve(callback(transaction)),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new ReturnsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.returnCase.findUnique.mockResolvedValue(existing);
    transaction.returnCase.findMany.mockResolvedValue([{ status: 'APPROVED' }]);
    transaction.returnCase.findUniqueOrThrow.mockResolvedValue(updated);
    transaction.returnItem.update.mockResolvedValue({});
    transaction.returnCase.update.mockResolvedValue({});
    transaction.returnStatusHistory.create.mockResolvedValue({});
    transaction.order.update.mockResolvedValue({});
    transaction.inventoryStock.update.mockResolvedValue({});
    transaction.inventoryMovement.create.mockResolvedValue({});
    audit.record.mockResolvedValue({});
  });

  it('records full approval quantities, history, order summary, and audit', async () => {
    await expect(
      service.review(
        'return-1',
        { decision: 'APPROVE', reason: 'Evidence confirms the request' },
        actor,
      ),
    ).resolves.toBe(updated);

    expect(transaction.returnItem.update).toHaveBeenCalledTimes(2);
    expect(transaction.returnItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { approvedQuantity: 2 },
    });
    expect(transaction.returnStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldStatus: 'REQUESTED',
        newStatus: 'APPROVED',
        actorId: 'admin-1',
      }),
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { returnStatus: 'APPROVED' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RETURN_CASE_REVIEWED', actor }),
      transaction,
    );
  });

  it('rejects partial approval without every item quantity', async () => {
    await expect(
      service.review(
        'return-1',
        {
          decision: 'PARTIAL_APPROVE',
          reason: 'Only one unit qualifies',
          items: [{ returnItemId: 'item-1', approvedQuantity: 1 }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.returnCase.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('records inspection and restores sellable inventory', async () => {
    transaction.returnCase.findUnique.mockResolvedValue({
      id: 'return-1',
      orderId: 'order-1',
      status: 'APPROVED',
      items: [
        {
          id: 'item-1',
          approvedQuantity: 2,
          orderItem: {
            reservations: [
              {
                inventoryId: 'stock-1',
                quantity: 2,
                inventory: { id: 'stock-1' },
              },
            ],
          },
        },
      ],
    });
    transaction.returnCase.findUniqueOrThrow.mockResolvedValue({
      id: 'return-1',
      status: 'INSPECTED',
    });

    await service.inspect(
      'return-1',
      {
        decision: 'ACCEPT',
        finalResolution: 'REFUND',
        note: 'Both units received and verified',
        items: [
          {
            returnItemId: 'item-1',
            receivedQuantity: 2,
            acceptedQuantity: 2,
            condition: 'UNUSED',
            inventoryDisposition: 'SELLABLE',
          },
        ],
      },
      actor,
    );

    expect(transaction.inventoryStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { onHand: { increment: 2 }, damaged: undefined },
    });
    expect(transaction.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RETURN',
        quantityDelta: 2,
        referenceType: 'ReturnCase',
        referenceId: 'return-1',
      }),
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { returnStatus: 'RECEIVED' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RETURN_CASE_INSPECTED' }),
      transaction,
    );
  });

  it('rejects inconsistent inspection quantities before stock changes', async () => {
    transaction.returnCase.findUnique.mockResolvedValue({
      id: 'return-1',
      orderId: 'order-1',
      status: 'APPROVED',
      items: [
        {
          id: 'item-1',
          approvedQuantity: 1,
          orderItem: { reservations: [] },
        },
      ],
    });

    await expect(
      service.inspect(
        'return-1',
        {
          decision: 'ACCEPT',
          finalResolution: 'REFUND',
          note: 'Invalid received quantity',
          items: [
            {
              returnItemId: 'item-1',
              receivedQuantity: 2,
              acceptedQuantity: 2,
              condition: 'UNUSED',
              inventoryDisposition: 'SELLABLE',
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.inventoryStock.update).not.toHaveBeenCalled();
  });

  it('restores damaged returns without making them available stock', async () => {
    transaction.returnCase.findUnique.mockResolvedValue({
      id: 'return-1',
      orderId: 'order-1',
      status: 'APPROVED',
      items: [
        {
          id: 'item-1',
          approvedQuantity: 1,
          orderItem: {
            reservations: [
              {
                inventoryId: 'stock-1',
                quantity: 1,
                inventory: { id: 'stock-1' },
              },
            ],
          },
        },
      ],
    });

    await service.inspect(
      'return-1',
      {
        decision: 'ACCEPT',
        finalResolution: 'REFUND',
        note: 'Damaged unit received',
        items: [
          {
            returnItemId: 'item-1',
            receivedQuantity: 1,
            acceptedQuantity: 1,
            condition: 'DAMAGED',
            inventoryDisposition: 'DAMAGED',
          },
        ],
      },
      actor,
    );

    expect(transaction.inventoryStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: {
        onHand: { increment: 1 },
        damaged: { increment: 1 },
      },
    });
    expect(transaction.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'DAMAGE',
        quantityDelta: 1,
      }),
    });
  });
});
