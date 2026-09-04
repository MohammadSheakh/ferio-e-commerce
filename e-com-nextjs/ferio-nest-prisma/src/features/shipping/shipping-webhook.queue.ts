import type { PrismaClient } from '@prisma/client';
import type { TenantFanoutService } from '../../tenancy/tenant-fanout.service';
import { tryGetTenantContext } from '../../tenancy/tenant-context';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { QUEUE_NAMES } from '@app/queue';
import { PrismaService } from '@app/database';
import { StructuredLogger, type UserPayload } from '@app/common';
import { AuditService } from '../audit/audit.service';

export const COURIER_CALLBACK_RETRY_JOB = 'retry-courier-callback';
export const COURIER_CALLBACK_SWEEP_JOB = 'sweep-courier-callbacks';
export const COURIER_CALLBACK_SCHEDULER_ID = 'ferio-courier-callback-retry';
export const COURIER_CALLBACK_PROCESSING_LEASE_MS = 5 * 60 * 1000;

export type CourierCallbackJobData = {
  callbackLogId?: string;
  initiatedByActorId?: string;
  organizationId?: string;
};

@Injectable()
export class ShippingWebhookQueue implements OnModuleInit {
  private readonly logger = new StructuredLogger(ShippingWebhookQueue.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.COURIER_CALLBACK)
    private readonly queue: Queue<CourierCallbackJobData>,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
    @Optional() private readonly fanout?: TenantFanoutService,
  ) {}

  async onModuleInit() {
    if (!this.scheduleEnabled()) return;
    try {
      await this.queue.upsertJobScheduler(
        COURIER_CALLBACK_SCHEDULER_ID,
        { every: this.scheduleEveryMinutes() * 60_000 },
        { name: COURIER_CALLBACK_SWEEP_JOB, data: {} },
      );
      this.logger.log('courier_callback_scheduler_registered', {
        schedulerId: COURIER_CALLBACK_SCHEDULER_ID,
        everyMinutes: this.scheduleEveryMinutes(),
        maxAttempts: this.maxAttempts(),
      });
    } catch (error) {
      this.logger.error(
        'courier_callback_scheduler_registration_failed',
        error,
        { schedulerId: COURIER_CALLBACK_SCHEDULER_ID },
      );
    }
  }

  async health() {
    const recoverableCount = await this.prisma.shipmentWebhookLog.count({
      where: this.recoverableWhere(),
    });
    try {
      const [counts, scheduler] = await Promise.all([
        this.queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        ),
        this.queue.getJobScheduler(COURIER_CALLBACK_SCHEDULER_ID),
      ]);
      return {
        available: true,
        scheduleEnabled: this.scheduleEnabled(),
        scheduleEveryMinutes: this.scheduleEveryMinutes(),
        maxAttempts: this.maxAttempts(),
        recoverableCount,
        counts,
        scheduler: scheduler
          ? {
              id: COURIER_CALLBACK_SCHEDULER_ID,
              name: scheduler.name,
              next: scheduler.next,
            }
          : null,
      };
    } catch (error) {
      return {
        available: false,
        scheduleEnabled: this.scheduleEnabled(),
        scheduleEveryMinutes: this.scheduleEveryMinutes(),
        maxAttempts: this.maxAttempts(),
        recoverableCount,
        counts: null,
        scheduler: null,
        error: error instanceof Error ? error.message : 'Queue unavailable',
      };
    }
  }

  async enqueueRecoverable() {
    // MT-8 §11.2: per-tenant fan-out with organization-stamped envelopes;
    // legacy mode runs once, envelope-free.
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      return this.enqueueForContext(undefined);
    }
    if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
    let queuedCount = 0;
    const fanout = await this.fanout.forEachTenant(
      async () => {
        const result = await this.enqueueForContext(
          tryGetTenantContext()?.organizationId,
        );
        queuedCount += result.queuedCount;
      },
      { label: 'courier-callback-retry-sweep' },
    );
    return { queuedCount, tenantFailures: fanout.failures };
  }

  private async enqueueForContext(organizationId?: string) {
    const client = await this.databaseForRequest();
    const callbacks = await client.shipmentWebhookLog.findMany({
      where: this.recoverableWhere(),
      orderBy: [{ lastAttemptAt: 'asc' }, { receivedAt: 'asc' }],
      take: 100,
      select: { id: true, attemptCount: true },
    });
    if (callbacks.length === 0) return { queuedCount: 0 };
    await this.queue.addBulk(
      callbacks.map((callback) => ({
        name: COURIER_CALLBACK_RETRY_JOB,
        data: {
          callbackLogId: callback.id,
          ...(organizationId ? { organizationId } : {}),
        },
        opts: {
          jobId: organizationId
            ? `t:${organizationId}:${this.retryJobId(callback.id, callback.attemptCount)}`
            : this.retryJobId(callback.id, callback.attemptCount),
        },
      })),
    );
    return { queuedCount: callbacks.length };
  }

  private async databaseForRequest(): Promise<PrismaClient> {
    if ((process.env.TENANCY_ENABLED || 'false') === 'true') {
      if (!this.tenantDb)
        throw new Error('TENANT_DATABASE_SERVICE_UNAVAILABLE');
      return this.tenantDb.get();
    }
    return this.prisma;
  }

  async enqueueRetry(callbackLogId: string, actor: UserPayload) {
    const callback = await this.prisma.shipmentWebhookLog.findUnique({
      where: { id: callbackLogId },
    });
    if (!callback) throw new NotFoundException('Courier callback not found');
    if (!callback.authValid) {
      throw new ConflictException('Rejected callbacks cannot be retried');
    }
    if (callback.processed) {
      throw new ConflictException('Processed callbacks do not need retry');
    }
    if (
      callback.processingStartedAt &&
      callback.processingStartedAt.getTime() >
        Date.now() - COURIER_CALLBACK_PROCESSING_LEASE_MS
    ) {
      throw new ConflictException('Courier callback is already processing');
    }
    if (callback.attemptCount >= this.maxAttempts()) {
      throw new ConflictException('Courier callback retry limit reached');
    }
    const jobId = this.retryJobId(callback.id, callback.attemptCount);
    const job = await this.queue.add(
      COURIER_CALLBACK_RETRY_JOB,
      { callbackLogId: callback.id, initiatedByActorId: actor.userId },
      { jobId },
    );
    await this.audit.record({
      action: 'COURIER_CALLBACK_RETRY_QUEUED',
      entityType: 'ShipmentWebhookLog',
      entityId: callback.id,
      actor,
      newValue: {
        jobId: String(job.id),
        attemptNumber: callback.attemptCount + 1,
      },
    });
    return {
      callbackLogId: callback.id,
      jobId: String(job.id),
      status: 'QUEUED' as const,
    };
  }

  private recoverableWhere(): Prisma.ShipmentWebhookLogWhereInput {
    return {
      authValid: true,
      processed: false,
      attemptCount: { lt: this.maxAttempts() },
      OR: [
        { processingStartedAt: null, lastAttemptAt: null },
        { processingError: { not: null } },
        {
          processingStartedAt: {
            lt: new Date(Date.now() - COURIER_CALLBACK_PROCESSING_LEASE_MS),
          },
        },
      ],
    };
  }

  private retryJobId(callbackLogId: string, attemptCount: number) {
    return `courier-callback-retry-${callbackLogId}-${attemptCount + 1}`;
  }

  private scheduleEnabled() {
    return (
      this.config.get<string>('COURIER_CALLBACK_RETRY_ENABLED', 'false') ===
      'true'
    );
  }

  private scheduleEveryMinutes() {
    return Number(
      this.config.get<string>('COURIER_CALLBACK_RETRY_EVERY_MINUTES', '5'),
    );
  }

  private maxAttempts() {
    return Number(
      this.config.get<string>('COURIER_CALLBACK_RETRY_MAX_ATTEMPTS', '6'),
    );
  }
}
