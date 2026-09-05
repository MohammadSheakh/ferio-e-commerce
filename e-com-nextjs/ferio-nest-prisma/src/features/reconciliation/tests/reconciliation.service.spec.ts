import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/audit.service';
import { ReconciliationService } from '../services/reconciliation.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;

describe('ReconciliationService', () => {
  const completedRun = {
    id: 'run-1',
    reference: 'REC-260811-ABC123',
    status: 'COMPLETED',
    detectedCount: 2,
    openedCount: 2,
    autoResolvedCount: 1,
  };
  const transaction = {
    reconciliationRun: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    reconciliationFinding: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shipment: { findMany: jest.fn() },
    codCollection: { findMany: jest.fn() },
    courierSettlement: { findMany: jest.fn() },
    order: { findMany: jest.fn() },
    inventoryReservation: { findMany: jest.fn() },
    inventoryStock: { findMany: jest.fn() },
    commerceRefund: { findMany: jest.fn() },
    commercePaymentAttempt: { findMany: jest.fn() },
  };
  const prisma = {
    reconciliationRun: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    reconciliationFinding: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    commercePaymentAttempt: { groupBy: jest.fn() },
    shipmentWebhookLog: { aggregate: jest.fn() },
    shipmentPollAttempt: { groupBy: jest.fn() },
    commerceMessage: { groupBy: jest.fn() },
    commerceRefund: { groupBy: jest.fn() },
    $transaction: jest.fn((input) =>
      typeof input === 'function' ? input(transaction) : Promise.all(input),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new ReconciliationService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.reconciliationRun.findUnique.mockResolvedValue(null);
    prisma.reconciliationRun.create.mockResolvedValue({ id: 'run-1' });
    prisma.reconciliationRun.update.mockResolvedValue({ id: 'run-1' });
    prisma.reconciliationRun.groupBy.mockResolvedValue([]);
    prisma.reconciliationFinding.groupBy.mockResolvedValue([]);
    prisma.commercePaymentAttempt.groupBy.mockResolvedValue([]);
    prisma.shipmentWebhookLog.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _min: { receivedAt: null },
      _max: { receivedAt: null, lastAttemptAt: null },
    });
    prisma.shipmentPollAttempt.groupBy.mockResolvedValue([]);
    prisma.commerceMessage.groupBy.mockResolvedValue([]);
    prisma.commerceRefund.groupBy.mockResolvedValue([]);
    transaction.reconciliationRun.findUnique.mockResolvedValue(null);
    transaction.reconciliationRun.create.mockResolvedValue({ id: 'run-1' });
    transaction.reconciliationRun.update.mockResolvedValue(completedRun);
    transaction.shipment.findMany.mockResolvedValue([]);
    transaction.codCollection.findMany.mockReset();
    transaction.codCollection.findMany
      .mockResolvedValueOnce([
        {
          id: 'collection-1',
          orderId: 'order-1',
          shipmentId: 'shipment-1',
          expectedAmount: 150000,
          expectedAt: new Date('2026-08-01T00:00:00.000Z'),
          order: { reference: 'FER-1001' },
          shipment: { provider: { code: 'STEADFAST' } },
        },
      ])
      .mockResolvedValue([]);
    transaction.courierSettlement.findMany.mockResolvedValue([]);
    transaction.order.findMany.mockResolvedValue([]);
    transaction.commercePaymentAttempt.findMany.mockResolvedValue([]);
    transaction.inventoryReservation.findMany.mockResolvedValue([]);
    transaction.inventoryStock.findMany.mockResolvedValue([
      {
        id: 'stock-1',
        onHand: 2,
        reserved: 2,
        damaged: 1,
        incoming: 0,
        variantId: 'variant-1',
        warehouseId: 'warehouse-1',
      },
    ]);
    transaction.commerceRefund.findMany.mockResolvedValue([]);
    transaction.reconciliationFinding.findMany.mockResolvedValue([]);
    transaction.reconciliationFinding.upsert.mockResolvedValue({});
    transaction.reconciliationFinding.updateMany.mockResolvedValue({
      count: 1,
    });
    audit.record.mockResolvedValue({});
  });

  it('paginates reconciliation findings without changing filtered totals', async () => {
    prisma.reconciliationFinding.findMany.mockResolvedValue([
      { id: 'finding-1' },
    ]);
    prisma.reconciliationFinding.count
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3);

    await expect(
      service.list({
        status: undefined,
        domain: 'PAYMENT',
        severity: undefined,
        page: 2,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [{ id: 'finding-1' }],
      total: 31,
      page: 2,
      limit: 20,
      totalPages: 2,
      summary: { OPEN: 20, ACKNOWLEDGED: 8, RESOLVED: 3 },
    });
    expect(prisma.reconciliationFinding.findMany).toHaveBeenCalledWith({
      where: {
        domain: 'PAYMENT',
        severity: undefined,
        status: undefined,
      },
      skip: 20,
      take: 20,
      orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
    });
  });

  it('persists detected findings and auto-resolves stale conditions', async () => {
    await expect(
      service.run('reconciliation-scan-key-0001', { overdueHours: 168 }, actor),
    ).resolves.toBe(completedRun);

    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'OVERDUE_COD_COLLECTION',
          severity: 'HIGH',
          entityId: 'collection-1',
        }),
      }),
    );
    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'INVALID_STOCK_BALANCE',
          severity: 'CRITICAL',
          entityId: 'stock-1',
        }),
      }),
    );
    expect(transaction.reconciliationRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        detectedCount: 2,
        openedCount: 2,
        autoResolvedCount: 1,
      }),
    });
    expect(prisma.reconciliationRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: 'RUNNING',
        attemptCount: { increment: 1 },
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RECONCILIATION_SCAN_COMPLETED' }),
      transaction,
    );
  });

  it('returns the original run for an idempotent replay', async () => {
    prisma.reconciliationRun.findUnique.mockResolvedValue(completedRun);
    await expect(
      service.run('reconciliation-scan-key-0002', { overdueHours: 168 }, actor),
    ).resolves.toBe(completedRun);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('summarizes durable reconciliation operations', async () => {
    const startedAt = new Date('2026-08-11T10:00:00.000Z');
    prisma.reconciliationRun.findFirst
      .mockResolvedValueOnce({ id: 'run-success', status: 'COMPLETED' })
      .mockResolvedValueOnce({ id: 'run-failed', status: 'FAILED' });
    prisma.reconciliationRun.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prisma.reconciliationRun.findMany.mockResolvedValue([
      {
        startedAt,
        completedAt: new Date(startedAt.getTime() + 100),
      },
      {
        startedAt,
        completedAt: new Date(startedAt.getTime() + 200),
      },
    ]);

    await expect(service.operationsSummary()).resolves.toEqual({
      windowHours: 24,
      completedCount: 3,
      failedCount: 1,
      successRate: 75,
      averageDurationMs: 150,
      lastSuccess: { id: 'run-success', status: 'COMPLETED' },
      lastFailure: { id: 'run-failed', status: 'FAILED' },
    });
  });

  it('aggregates actionable critical-path and provider alerts', async () => {
    prisma.reconciliationFinding.groupBy.mockResolvedValue([
      {
        severity: 'CRITICAL',
        _count: { severity: 2 },
        _min: { firstDetectedAt: new Date('2026-08-21T10:00:00.000Z') },
        _max: { lastSeenAt: new Date('2026-08-21T11:00:00.000Z') },
      },
    ]);
    prisma.commercePaymentAttempt.groupBy.mockResolvedValue([
      {
        status: 'UNKNOWN',
        _count: { status: 1 },
        _min: { createdAt: new Date('2026-08-21T12:00:00.000Z') },
        _max: { updatedAt: new Date('2026-08-21T12:01:00.000Z') },
      },
    ]);

    const result = await service.getOperationalAlerts();

    expect(result.summary).toEqual({
      total: 2,
      critical: 2,
      high: 0,
      medium: 0,
    });
    expect(result.alerts.map((alert) => alert.code)).toEqual([
      'RECONCILIATION_CRITICAL',
      'PAYMENT_OUTCOME_UNKNOWN',
    ]);
    expect(prisma.shipmentWebhookLog.aggregate).toHaveBeenCalledTimes(2);
  });

  it('records a failed run outside the rolled-back scan transaction', async () => {
    transaction.shipment.findMany.mockReset();
    transaction.shipment.findMany.mockRejectedValue(
      new Error('provider query unavailable'),
    );
    prisma.reconciliationRun.update
      .mockResolvedValueOnce({ id: 'run-1', status: 'RUNNING' })
      .mockResolvedValueOnce({ id: 'run-1', status: 'FAILED' });

    await expect(
      service.run('reconciliation-scan-key-0003', { overdueHours: 168 }, actor),
    ).rejects.toThrow('provider query unavailable');

    expect(prisma.reconciliationRun.update).toHaveBeenLastCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        failureReason: 'provider query unavailable',
      }),
    });
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'RECONCILIATION_SCAN_FAILED' }),
    );
  });

  it('retries a failed run with the same durable run id', async () => {
    prisma.reconciliationRun.findUnique.mockResolvedValue({
      id: 'run-failed',
      status: 'FAILED',
      overdueHours: 72,
    });

    await expect(
      service.retryRun('run-failed', 'job-retry-1', 'admin-1'),
    ).resolves.toBe(completedRun);

    expect(prisma.reconciliationRun.create).not.toHaveBeenCalled();
    expect(prisma.reconciliationRun.update).toHaveBeenCalledWith({
      where: { id: 'run-failed' },
      data: expect.objectContaining({
        trigger: 'RETRY',
        queueJobId: 'job-retry-1',
        attemptCount: { increment: 1 },
      }),
    });
  });

  it('resolves a finding with owner, actor, note, and audit evidence', async () => {
    const previous = {
      id: 'finding-1',
      status: 'ACKNOWLEDGED',
      ownerActorId: null,
    };
    const updated = {
      ...previous,
      status: 'RESOLVED',
      ownerActorId: 'admin-1',
    };
    transaction.reconciliationFinding.findUnique.mockResolvedValue(previous);
    transaction.reconciliationFinding.update.mockResolvedValue(updated);

    await expect(
      service.action(
        'finding-1',
        { action: 'RESOLVE', note: 'Provider statement corrected' },
        actor,
      ),
    ).resolves.toBe(updated);

    expect(transaction.reconciliationFinding.update).toHaveBeenCalledWith({
      where: { id: 'finding-1' },
      data: expect.objectContaining({
        status: 'RESOLVED',
        ownerActorId: 'admin-1',
        resolvedByActorId: 'admin-1',
        resolutionNote: 'Provider statement corrected',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RECONCILIATION_FINDING_RESOLVE' }),
      transaction,
    );
  });

  it('detects prepaid payment state mismatches, unverified paid orders, and amount mismatches', async () => {
    transaction.codCollection.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    transaction.inventoryStock.findMany.mockResolvedValue([]);
    transaction.order.findMany
      .mockResolvedValueOnce([]) // COD paid orders
      .mockResolvedValueOnce([
        // Prepaid paid orders
        {
          id: 'prepaid-order-unverified',
          reference: 'FER-PRE-001',
          total: 100000,
          paymentAttempts: [],
        },
      ]);
    transaction.commercePaymentAttempt.findMany.mockResolvedValue([
      {
        id: 'attempt-mismatched-state',
        merchantTransactionId: 'FERPAY-001',
        amount: 200000,
        orderId: 'order-unpaid',
        providerTransactionId: 'BANK-123',
        order: {
          id: 'order-unpaid',
          reference: 'FER-PRE-002',
          paymentStatus: 'UNPAID',
          total: 150000,
        },
      },
    ]);

    await service.run(
      'reconciliation-scan-key-prepaid',
      { overdueHours: 168 },
      actor,
    );

    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'PREPAID_UNVERIFIED_PAID_ORDER',
          severity: 'CRITICAL',
          entityId: 'prepaid-order-unverified',
        }),
      }),
    );
    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'PREPAID_PAYMENT_STATE_MISMATCH',
          severity: 'CRITICAL',
          entityId: 'attempt-mismatched-state',
        }),
      }),
    );
    expect(transaction.reconciliationFinding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'PREPAID_AMOUNT_MISMATCH',
          severity: 'CRITICAL',
          entityId: 'attempt-mismatched-state',
        }),
      }),
    );
  });
});
