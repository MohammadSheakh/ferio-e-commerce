import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { PrismaService } from '@app/database';
import type { RedisService } from '@app/redis';
import { RequestMetrics } from '@app/common';
import type { PaymentGatewayRegistry } from '../../commerce-payments/gateways/payment-gateway.registry';
import type { ShippingService } from '../../shipping/services/shipping.service';
import { OperationsHealthService } from '../operations-health.service';

describe('OperationsHealthService', () => {
  beforeEach(() => RequestMetrics.resetForTests());

  it('combines runtime, queue, commerce, provider, and backup evidence', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      order: { count },
      commercePaymentAttempt: { count },
      shipment: { count },
      commerceRefund: { count },
      reconciliationFinding: { count },
    } as unknown as PrismaService;
    const redis = {
      getClient: jest
        .fn()
        .mockResolvedValue({ ping: jest.fn().mockResolvedValue('PONG') }),
    } as unknown as RedisService;
    const now = new Date().toISOString();
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            DATABASE_BACKUP_ENABLED: 'true',
            DATABASE_BACKUP_LAST_SUCCESS_AT: now,
            DATABASE_RESTORE_LAST_VERIFIED_AT: now,
            OBJECT_STORAGE_PROTECTION_ENABLED: 'true',
          })[key],
      ),
    } as unknown as ConfigService;
    const payments = {
      readiness: jest
        .fn()
        .mockReturnValue([
          { code: 'SSLCOMMERZ', name: 'SSLCommerz', configured: true },
        ]),
    } as unknown as PaymentGatewayRegistry;
    const shipping = {
      getProviders: jest.fn().mockResolvedValue([
        {
          code: 'PATHAO',
          name: 'Pathao',
          isActive: true,
          configured: true,
          pollingConfigured: true,
        },
      ]),
    } as unknown as ShippingService;
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 0,
        completed: 8,
        failed: 0,
        delayed: 0,
      }),
    } as unknown as Queue;
    RequestMetrics.record({ statusCode: 200, durationMs: 12 });
    const service = new OperationsHealthService(
      prisma,
      redis,
      config,
      payments,
      shipping,
      queue,
      queue,
      queue,
      queue,
      queue,
      queue,
      undefined,
    );

    const health = await service.getHealth();

    expect(health).toEqual(
      expect.objectContaining({
        runtimeStatus: 'HEALTHY',
        launchReady: true,
        launchBlockers: [],
        requests: expect.objectContaining({ total: 1, p95DurationMs: 12 }),
        commerce: expect.objectContaining({ available: true, ordersPlaced: 2 }),
        backup: expect.objectContaining({
          status: 'CURRENT',
          restoreStatus: 'VERIFIED',
        }),
      }),
    );
    expect(health.queues).toHaveLength(6);
  });

  it('reports unavailable dependencies and missing launch evidence without throwing', async () => {
    const failingQueue = {
      getJobCounts: jest
        .fn()
        .mockRejectedValue(new Error('secret queue error')),
    } as unknown as Queue;
    const service = new OperationsHealthService(
      {
        $queryRaw: jest
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
        order: {
          count: jest.fn().mockRejectedValue(new Error('database unavailable')),
        },
        commercePaymentAttempt: { count: jest.fn() },
        shipment: { count: jest.fn() },
        commerceRefund: { count: jest.fn() },
        reconciliationFinding: { count: jest.fn() },
      } as unknown as PrismaService,
      {
        getClient: jest.fn().mockResolvedValue(null),
      } as unknown as RedisService,
      { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
      {
        readiness: jest.fn().mockReturnValue([]),
      } as unknown as PaymentGatewayRegistry,
      {
        getProviders: jest
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
      } as unknown as ShippingService,
      failingQueue,
      failingQueue,
      failingQueue,
      failingQueue,
      failingQueue,
      failingQueue,
      undefined,
    );

    const health = await service.getHealth();

    expect(health.runtimeStatus).toBe('UNAVAILABLE');
    expect(health.launchReady).toBe(false);
    expect(health.launchBlockers).toHaveLength(4);
    expect(health.dependencies.database.detail).toBe('PostgreSQL probe failed');
    expect(JSON.stringify(health)).not.toContain('secret queue error');
  });
});
