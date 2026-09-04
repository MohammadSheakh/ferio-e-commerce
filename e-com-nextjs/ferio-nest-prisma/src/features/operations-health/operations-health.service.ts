import { Injectable, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/redis';
import { QUEUE_NAMES } from '@app/queue';
import { RequestMetrics } from '@app/common';
import { PaymentGatewayRegistry } from '../commerce-payments/gateways/payment-gateway.registry';
import { ShippingService } from '../shipping/shipping.service';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { PrismaClient } from '@prisma/client';

type DependencyProbe = {
  available: boolean;
  latencyMs: number | null;
  detail?: string;
};

type QueueEvidence = {
  name: string;
  available: boolean;
  counts: Record<string, number> | null;
};

type CourierReadiness = Awaited<ReturnType<ShippingService['getProviders']>>;

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OperationsHealthService {
  private readonly queues: Array<{ name: string; queue: Queue }>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly paymentGateways: PaymentGatewayRegistry,
    private readonly shipping: ShippingService,
    @InjectQueue(QUEUE_NAMES.EMAIL) emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.RECONCILIATION) reconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COURIER_CALLBACK) courierCallbackQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COURIER_POLL) courierPollQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TRANSACTIONAL_MESSAGE)
    transactionalMessageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT_RECOVERY) paymentRecoveryQueue: Queue,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {
    this.queues = [
      { name: 'Authentication email', queue: emailQueue },
      { name: 'Reconciliation', queue: reconciliationQueue },
      { name: 'Courier callbacks', queue: courierCallbackQueue },
      { name: 'Courier polling', queue: courierPollQueue },
      { name: 'Transactional messages', queue: transactionalMessageQueue },
      { name: 'Payment recovery', queue: paymentRecoveryQueue },
    ];
  }

  private async db(): Promise<PrismaClient> {
    return ((await this.tenantDb?.tryGet()) ?? this.prisma) as PrismaClient;
  }

  async getHealth() {
    const [database, redis, queues, commerce, couriers] = await Promise.all([
      this.databaseProbe(),
      this.redisProbe(),
      Promise.all(this.queues.map((queue) => this.queueEvidence(queue))),
      this.commerceEvidence(),
      this.shipping.getProviders().catch(() => [] as CourierReadiness),
    ]);
    const payments = this.paymentGateways.readiness();
    const backup = this.backupEvidence();
    const runtimeStatus =
      !database.available || !redis.available
        ? 'UNAVAILABLE'
        : queues.some((queue) => !queue.available)
          ? 'DEGRADED'
          : 'HEALTHY';
    const launchBlockers = [
      ...(payments.some((provider) => provider.configured)
        ? []
        : ['No prepaid payment provider is configured.']),
      ...(couriers.some((provider) => provider.isActive && provider.configured)
        ? []
        : ['No active courier has verified runtime configuration.']),
      ...(backup.status === 'CURRENT'
        ? []
        : ['Current database backup evidence is unavailable.']),
      ...(backup.restoreStatus === 'VERIFIED'
        ? []
        : ['A current restore-exercise record is unavailable.']),
    ];

    return {
      generatedAt: new Date().toISOString(),
      runtimeStatus,
      launchReady: runtimeStatus === 'HEALTHY' && launchBlockers.length === 0,
      launchBlockers,
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rssBytes: process.memoryUsage().rss,
          heapUsedBytes: process.memoryUsage().heapUsed,
        },
      },
      requests: RequestMetrics.snapshot(),
      dependencies: {
        database,
        redis,
        pools: {
          controlPlane: this.prisma.poolMetrics,
          tenant: this.tenantDb?.metrics(),
        },
      },
      queues,
      commerce,
      providers: {
        payments,
        couriers: couriers.map((provider) => ({
          code: provider.code,
          name: provider.name,
          active: provider.isActive,
          configured: provider.configured,
          pollingConfigured: provider.pollingConfigured,
        })),
      },
      backup,
    };
  }

  private async databaseProbe(): Promise<DependencyProbe> {
    const startedAt = Date.now();
    try {
      const db = await this.db();
      await db.$queryRaw`SELECT 1`;
      return { available: true, latencyMs: Date.now() - startedAt };
    } catch {
      return {
        available: false,
        latencyMs: null,
        detail: 'PostgreSQL probe failed',
      };
    }
  }

  private async redisProbe(): Promise<DependencyProbe> {
    const client = await this.redis.getClient();
    if (!client) {
      return { available: false, latencyMs: null, detail: 'Redis unavailable' };
    }
    const startedAt = Date.now();
    try {
      await client.ping();
      return { available: true, latencyMs: Date.now() - startedAt };
    } catch {
      return {
        available: false,
        latencyMs: null,
        detail: 'Redis probe failed',
      };
    }
  }

  private async queueEvidence(input: {
    name: string;
    queue: Queue;
  }): Promise<QueueEvidence> {
    try {
      const counts = await input.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      return { name: input.name, available: true, counts };
    } catch {
      return { name: input.name, available: false, counts: null };
    }
  }

  private async commerceEvidence() {
    const since = new Date(Date.now() - DAY_MS);
    try {
      const db = await this.db();
      const [
        ordersPlaced,
        ordersDelivered,
        paidOrders,
        failedPaymentAttempts,
        unknownPaymentAttempts,
        shipmentsCreated,
        failedRefunds,
        openCriticalFindings,
      ] = await Promise.all([
        db.order.count({ where: { createdAt: { gte: since } } }),
        db.order.count({
          where: {
            status: { in: ['DELIVERED', 'COMPLETED'] },
            updatedAt: { gte: since },
          },
        }),
        db.order.count({
          where: { paymentStatus: 'PAID', updatedAt: { gte: since } },
        }),
        db.commercePaymentAttempt.count({
          where: { status: 'FAILED', createdAt: { gte: since } },
        }),
        db.commercePaymentAttempt.count({
          where: { status: 'UNKNOWN', createdAt: { gte: since } },
        }),
        db.shipment.count({ where: { createdAt: { gte: since } } }),
        db.commerceRefund.count({
          where: { status: 'FAILED', createdAt: { gte: since } },
        }),
        db.reconciliationFinding.count({
          where: {
            status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            severity: { in: ['CRITICAL', 'HIGH'] },
          },
        }),
      ]);
      return {
        available: true,
        windowHours: 24,
        ordersPlaced,
        ordersDelivered,
        paidOrders,
        failedPaymentAttempts,
        unknownPaymentAttempts,
        shipmentsCreated,
        failedRefunds,
        openCriticalFindings,
      };
    } catch {
      return { available: false, windowHours: 24 };
    }
  }

  private backupEvidence() {
    const enabled =
      this.config.get<string>('DATABASE_BACKUP_ENABLED') === 'true';
    const lastSuccessAt = this.validDate(
      this.config.get<string>('DATABASE_BACKUP_LAST_SUCCESS_AT'),
    );
    const lastRestoreAt = this.validDate(
      this.config.get<string>('DATABASE_RESTORE_LAST_VERIFIED_AT'),
    );
    const protectedStorage =
      this.config.get<string>('OBJECT_STORAGE_PROTECTION_ENABLED') === 'true';
    const current =
      enabled &&
      protectedStorage &&
      lastSuccessAt !== null &&
      Date.now() - lastSuccessAt.getTime() <= 25 * 60 * 60 * 1000;
    const restoreVerified =
      lastRestoreAt !== null &&
      Date.now() - lastRestoreAt.getTime() <= 180 * DAY_MS;
    return {
      source: 'DEPLOYMENT_ENVIRONMENT',
      status: current
        ? 'CURRENT'
        : enabled
          ? 'STALE_OR_UNPROTECTED'
          : 'MISSING',
      enabled,
      protectedStorage,
      lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
      restoreStatus: restoreVerified ? 'VERIFIED' : 'MISSING_OR_STALE',
      lastRestoreVerifiedAt: lastRestoreAt?.toISOString() ?? null,
    };
  }

  private validDate(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
