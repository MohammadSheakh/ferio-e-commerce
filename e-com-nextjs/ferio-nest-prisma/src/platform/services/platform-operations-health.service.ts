import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { TenantMetrics } from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { SupportAccessService } from './support-access.service';

type QueueHealth = {
  name: string;
  available: boolean;
  counts: Record<string, number> | null;
};

@Injectable()
export class PlatformOperationsHealthService {
  private readonly queues: Array<{ name: string; queue: Queue }>;

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly supportAccess: SupportAccessService,
    @InjectQueue(QUEUE_NAMES.EMAIL) emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.RECONCILIATION) reconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COURIER_CALLBACK) courierCallbackQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COURIER_POLL) courierPollQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TRANSACTIONAL_MESSAGE)
    transactionalMessageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT_RECOVERY) paymentRecoveryQueue: Queue,
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

  async getHealth() {
    const [database, queues, tenantDatabases, activeSupportGrants] =
      await Promise.all([
        this.databaseProbe(),
        Promise.all(this.queues.map((queue) => this.queueHealth(queue))),
        this.platform.client.tenantDatabase.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.supportAccess.countActive(),
      ]);
    const backup = this.backupEvidence();
    const metrics = TenantMetrics.snapshot();
    const failedQueues = queues.filter((queue) => !queue.available).length;
    const alerts = [
      ...(failedQueues > 0
        ? [`${failedQueues} platform queue probe(s) unavailable.`]
        : []),
      ...(activeSupportGrants > 0
        ? [`${activeSupportGrants} support access grant(s) currently active.`]
        : []),
      ...(backup.status !== 'CURRENT'
        ? ['Database backup evidence is missing or stale.']
        : []),
      ...(backup.restoreStatus !== 'VERIFIED'
        ? ['Database restore evidence is missing or stale.']
        : []),
    ];

    return {
      generatedAt: new Date().toISOString(),
      runtimeStatus: !database.available
        ? 'UNAVAILABLE'
        : failedQueues > 0
          ? 'DEGRADED'
          : 'HEALTHY',
      database,
      queues,
      tenantDatabases: Object.fromEntries(
        tenantDatabases.map((row) => [row.status, row._count._all]),
      ),
      backup,
      support: { activeGrants: activeSupportGrants },
      alerts,
      metrics: {
        observedSince: metrics.observedSince,
        totalIncrements: metrics.totalIncrements,
        seriesCount: metrics.counters.length,
      },
    };
  }

  private async databaseProbe() {
    const startedAt = Date.now();
    try {
      await this.platform.client.$queryRaw`SELECT 1`;
      return {
        available: true,
        latencyMs: Date.now() - startedAt,
        pool: this.platform.poolMetrics,
      };
    } catch {
      return {
        available: false,
        latencyMs: null,
        pool: this.platform.poolMetrics,
      };
    }
  }

  private async queueHealth(input: {
    name: string;
    queue: Queue;
  }): Promise<QueueHealth> {
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

  private backupEvidence() {
    const enabled = process.env.DATABASE_BACKUP_ENABLED === 'true';
    const lastSuccessAt = this.validDate(
      process.env.DATABASE_BACKUP_LAST_SUCCESS_AT,
    );
    const lastRestoreAt = this.validDate(
      process.env.DATABASE_RESTORE_LAST_VERIFIED_AT,
    );
    const protectedStorage =
      process.env.OBJECT_STORAGE_PROTECTION_ENABLED === 'true';
    const current =
      enabled &&
      protectedStorage &&
      lastSuccessAt !== null &&
      Date.now() - lastSuccessAt.getTime() <= 25 * 60 * 60 * 1000;
    const restoreVerified =
      lastRestoreAt !== null &&
      Date.now() - lastRestoreAt.getTime() <= 180 * 24 * 60 * 60 * 1000;
    return {
      source: 'DEPLOYMENT_ENVIRONMENT',
      status: current ? 'CURRENT' : enabled ? 'STALE_OR_UNPROTECTED' : 'MISSING',
      restoreStatus: restoreVerified ? 'VERIFIED' : 'MISSING_OR_STALE',
      protectedStorage,
      lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
      lastRestoreVerifiedAt: lastRestoreAt?.toISOString() ?? null,
    };
  }

  private validDate(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
