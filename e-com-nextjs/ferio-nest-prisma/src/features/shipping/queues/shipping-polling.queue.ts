import { tryGetTenantContext } from '../../../tenancy/tenant-context';
import type { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { StructuredLogger, type UserPayload } from '@app/common';
import { AuditService } from '../../audit/audit.service';
import { ShippingPollingService } from '../services/shipping-polling.service';

export const COURIER_POLL_JOB = 'poll-courier-shipment';
export const COURIER_POLL_SWEEP_JOB = 'sweep-courier-polls';
export const COURIER_POLL_SCHEDULER_ID = 'ferio-courier-polling';

export type CourierPollJobData = {
  pollAttemptId?: string;
  organizationId?: string;
};

@Injectable()
export class ShippingPollingQueue implements OnModuleInit {
  private readonly logger = new StructuredLogger(ShippingPollingQueue.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.COURIER_POLL)
    private readonly queue: Queue<CourierPollJobData>,
    private readonly config: ConfigService,
    private readonly polling: ShippingPollingService,
    private readonly audit: AuditService,
    @Optional() private readonly fanout?: TenantFanoutService,
) {}

  async onModuleInit() {
    if (!this.scheduleEnabled()) return;
    try {
      await this.queue.upsertJobScheduler(
        COURIER_POLL_SCHEDULER_ID,
        { every: this.scheduleEveryMinutes() * 60_000 },
        { name: COURIER_POLL_SWEEP_JOB, data: {} },
      );
      this.logger.log('courier_polling_scheduler_registered', {
        schedulerId: COURIER_POLL_SCHEDULER_ID,
        everyMinutes: this.scheduleEveryMinutes(),
        batchSize: this.batchSize(),
      });
    } catch (error) {
      this.logger.error(
        'courier_polling_scheduler_registration_failed',
        error,
        { schedulerId: COURIER_POLL_SCHEDULER_ID },
      );
    }
  }

  async health() {
    const eligibleCount = (
      await this.polling.eligibleShipments(this.batchSize())
    ).length;
    try {
      const [counts, scheduler] = await Promise.all([
        this.queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        ),
        this.queue.getJobScheduler(COURIER_POLL_SCHEDULER_ID),
      ]);
      return {
        available: true,
        scheduleEnabled: this.scheduleEnabled(),
        scheduleEveryMinutes: this.scheduleEveryMinutes(),
        batchSize: this.batchSize(),
        eligibleCount,
        counts,
        scheduler: scheduler
          ? {
              id: COURIER_POLL_SCHEDULER_ID,
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
        batchSize: this.batchSize(),
        eligibleCount,
        counts: null,
        scheduler: null,
        error: error instanceof Error ? error.message : 'Queue unavailable',
      };
    }
  }

  async enqueueDue() {
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
      { label: 'courier-poll-sweep' },
    );
    return { queuedCount, tenantFailures: fanout.failures };
  }

  private async enqueueForContext(organizationId?: string) {
    const shipments = await this.polling.eligibleShipments(this.batchSize());
    const attempts: Awaited<
      ReturnType<ShippingPollingService['prepareAttempt']>
    >[] = [];
    for (const shipment of shipments) {
      attempts.push(await this.polling.prepareAttempt(shipment.id));
    }
    if (attempts.length === 0) return { queuedCount: 0 };
    const jobs = await this.queue.addBulk(
      attempts.map((attempt) => ({
        name: COURIER_POLL_JOB,
        data: {
          pollAttemptId: attempt.id,
          ...(organizationId ? { organizationId } : {}),
        },
        opts: {
          jobId: organizationId
            ? `t:${organizationId}:courier-poll-${attempt.id}`
            : `courier-poll-${attempt.id}`,
        },
      })),
    );
    await Promise.all(
      jobs.map((job, index) =>
        this.polling.attachQueueJob(attempts[index].id, String(job.id)),
      ),
    );
    return { queuedCount: jobs.length };
  }

  async enqueueShipment(shipmentId: string, actor: UserPayload) {
    const attempt = await this.polling.prepareAttempt(shipmentId, actor.userId);
    const job = await this.queue.add(
      COURIER_POLL_JOB,
      { pollAttemptId: attempt.id },
      { jobId: `courier-poll-${attempt.id}` },
    );
    await this.polling.attachQueueJob(attempt.id, String(job.id));
    await this.audit.record({
      action: 'COURIER_POLL_QUEUED',
      entityType: 'Shipment',
      entityId: shipmentId,
      actor,
      newValue: { attemptId: attempt.id, jobId: String(job.id) },
    });
    return {
      shipmentId,
      pollAttemptId: attempt.id,
      jobId: String(job.id),
      status: 'QUEUED' as const,
    };
  }

  private scheduleEnabled() {
    return (
      this.config.get<string>('COURIER_POLLING_ENABLED', 'false') === 'true'
    );
  }

  private scheduleEveryMinutes() {
    return Number(
      this.config.get<string>('COURIER_POLLING_EVERY_MINUTES', '15'),
    );
  }

  private batchSize() {
    return Number(this.config.get<string>('COURIER_POLLING_BATCH_SIZE', '100'));
  }
}
