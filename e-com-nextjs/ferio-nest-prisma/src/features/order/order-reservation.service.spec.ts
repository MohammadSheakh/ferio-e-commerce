import { ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@app/database';
import type { CartService } from '../cart/cart.service';
import type { TransactionalMessagingService } from '../transactional-messaging/transactional-messaging.service';
import type { AuditService } from '../audit/audit.service';
import { OrderService } from './order.service';

function createService() {
  return new OrderService(
    {} as PrismaService,
    {} as CartService,
    {} as TransactionalMessagingService,
    {} as AuditService,
    { get: jest.fn() } as unknown as ConfigService,
    {} as never, // wallet
    {} as never, // customer notifications
  );
}

function createTransaction() {
  return {
    order: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    inventoryStock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventoryReservation: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryMovement: { create: jest.fn() },
  };
}

describe('OrderService reservation rules', () => {
  it('splits a prepaid retry reservation deterministically across warehouses', async () => {
    const service = createService();
    const transaction = createTransaction();
    const expiresAt = new Date('2026-08-22T10:00:00.000Z');
    transaction.order.findUnique.mockResolvedValue({
      id: 'order-1',
      paymentMethod: 'PREPAID',
      paymentStatus: 'FAILED',
      status: 'PENDING_CONFIRMATION',
      items: [{ id: 'item-1', variantId: 'variant-1', quantity: 3 }],
    });
    transaction.inventoryReservation.count.mockResolvedValue(0);
    transaction.inventoryReservation.findMany.mockResolvedValue([]);
    transaction.inventoryStock.findMany.mockResolvedValue([
      { id: 'stock-a', onHand: 2, reserved: 1, damaged: 0 },
      { id: 'stock-b', onHand: 3, reserved: 1, damaged: 0 },
    ]);

    await service.preparePrepaidRetry(
      transaction as unknown as Prisma.TransactionClient,
      'order-1',
      expiresAt,
    );

    expect(transaction.inventoryStock.update.mock.calls).toEqual([
      [{ where: { id: 'stock-a' }, data: { reserved: { increment: 1 } } }],
      [{ where: { id: 'stock-b' }, data: { reserved: { increment: 2 } } }],
    ]);
    expect(transaction.inventoryReservation.create.mock.calls).toEqual([
      [
        {
          data: {
            inventoryId: 'stock-a',
            orderItemId: 'item-1',
            quantity: 1,
            expiresAt,
          },
        },
      ],
      [
        {
          data: {
            inventoryId: 'stock-b',
            orderItemId: 'item-1',
            quantity: 2,
            expiresAt,
          },
        },
      ],
    ]);
    expect(transaction.inventoryMovement.create.mock.calls).toEqual([
      [
        {
          data: expect.objectContaining({
            inventoryId: 'stock-a',
            type: 'RESERVE',
            quantityDelta: 1,
            referenceId: 'order-1',
          }),
        },
      ],
      [
        {
          data: expect.objectContaining({
            inventoryId: 'stock-b',
            type: 'RESERVE',
            quantityDelta: 2,
            referenceId: 'order-1',
          }),
        },
      ],
    ]);
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { paymentStatus: 'UNPAID' },
    });
  });

  it('rejects insufficient aggregate stock before creating a reservation', async () => {
    const service = createService();
    const transaction = createTransaction();
    transaction.order.findUnique.mockResolvedValue({
      id: 'order-2',
      paymentMethod: 'PREPAID',
      paymentStatus: 'FAILED',
      status: 'PENDING_CONFIRMATION',
      items: [{ id: 'item-2', variantId: 'variant-2', quantity: 3 }],
    });
    transaction.inventoryReservation.count.mockResolvedValue(0);
    transaction.inventoryReservation.findMany.mockResolvedValue([]);
    transaction.inventoryStock.findMany.mockResolvedValue([
      { id: 'stock-c', onHand: 2, reserved: 0, damaged: 0 },
    ]);

    await expect(
      service.preparePrepaidRetry(
        transaction as unknown as Prisma.TransactionClient,
        'order-2',
        new Date('2026-08-22T10:00:00.000Z'),
      ),
    ).rejects.toThrow(ConflictException);
    expect(transaction.inventoryStock.update).not.toHaveBeenCalled();
    expect(transaction.inventoryReservation.create).not.toHaveBeenCalled();
    expect(transaction.inventoryMovement.create).not.toHaveBeenCalled();
    expect(transaction.order.update).not.toHaveBeenCalled();
  });

  it('releases an expired reservation with an exact inverse movement', async () => {
    const service = createService();
    const transaction = createTransaction();
    transaction.order.count.mockResolvedValue(0);
    transaction.inventoryReservation.findMany.mockResolvedValue([
      { id: 'reservation-1', inventoryId: 'stock-d', quantity: 2 },
    ]);
    transaction.inventoryStock.findUnique.mockResolvedValue({
      id: 'stock-d',
      reserved: 3,
    });

    await service.expirePrepaidOrder(
      transaction as unknown as Prisma.TransactionClient,
      'order-3',
    );

    expect(transaction.inventoryStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-d' },
      data: { reserved: { decrement: 2 } },
    });
    expect(transaction.inventoryReservation.update).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: { status: 'RELEASED', releasedAt: expect.any(Date) },
    });
    expect(transaction.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        inventoryId: 'stock-d',
        type: 'RELEASE',
        quantityDelta: -2,
        reason: 'Prepaid payment window expired',
        referenceType: 'Order',
        referenceId: 'order-3',
        actorId: 'SYSTEM_PAYMENT',
      },
    });
    expect(transaction.order.update).toHaveBeenCalledWith({
      where: { id: 'order-3' },
      data: { paymentStatus: 'FAILED' },
    });
  });

  it('refuses release when durable stock and reservation evidence disagree', async () => {
    const service = createService();
    const transaction = createTransaction();
    transaction.order.count.mockResolvedValue(0);
    transaction.inventoryReservation.findMany.mockResolvedValue([
      { id: 'reservation-2', inventoryId: 'stock-e', quantity: 2 },
    ]);
    transaction.inventoryStock.findUnique.mockResolvedValue({
      id: 'stock-e',
      reserved: 1,
    });

    await expect(
      service.expirePrepaidOrder(
        transaction as unknown as Prisma.TransactionClient,
        'order-4',
      ),
    ).rejects.toThrow('Inventory reservation is inconsistent');
    expect(transaction.inventoryStock.update).not.toHaveBeenCalled();
    expect(transaction.inventoryReservation.update).not.toHaveBeenCalled();
    expect(transaction.inventoryMovement.create).not.toHaveBeenCalled();
    expect(transaction.order.update).not.toHaveBeenCalled();
  });
});
