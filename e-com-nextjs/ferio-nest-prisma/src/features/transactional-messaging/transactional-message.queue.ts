import {
  ConflictException,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { UserPayload } from '@app/common';
import { TenantFanoutService } from '../../tenancy/tenant-fanout.service';
import { tryGetTenantContext } from '../../tenancy/tenant-context';
import { QUEUE_NAMES } from '@app/queue';
import { AuditService } from '../audit/audit.service';
import { TransactionalMessagingService } from './transactional-messaging.service';

export const TRANSACTIONAL_MESSAGE_JOB = 'dispatch-transactional-message';
export const TRANSACTIONAL_MESSAGE_SWEEP_JOB = 'sweep-transactional-messages';
export const TRANSACTIONAL_MESSAGE_SCHEDULER_ID =
  'ferio-transactional-message-dispatch';

export type TransactionalMessageJobData = {
  messageId?: string;
  organizationId?: string;
};

@Injectable()
export class TransactionalMessageQueue implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUE_NAMES.TRANSACTIONAL_MESSAGE)
    private readonly queue: Queue<TransactionalMessageJobData>,
    private readonly config: ConfigService,
    private readonly messages: TransactionalMessagingService,
    private readonly audit: AuditService,
    @Optional() private readonly fanout?: TenantFanoutService,
  ) {}

  async onModuleInit() {
    if (!this.enabled()) return;
    await this.queue.upsertJobScheduler(
      TRANSACTIONAL_MESSAGE_SCHEDULER_ID,
      { every: this.everyMinutes() * 60_000 },
      { name: TRANSACTIONAL_MESSAGE_SWEEP_JOB, data: {} },
    );
  }

  async health() {
    const policy = await this.messages.getPolicy();
    try {
      const [counts, scheduler, eligible] = await Promise.all([
        this.queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        ),
        this.queue.getJobScheduler(TRANSACTIONAL_MESSAGE_SCHEDULER_ID),
        this.messages.eligibleMessages(this.batchSize()),
      ]);
      return {
        available: true,
        dispatchEnabled: this.enabled(),
        everyMinutes: this.everyMinutes(),
        batchSize: this.batchSize(),
        eligibleCount: eligible.length,
        counts,
        scheduler: scheduler
          ? { id: scheduler.id, name: scheduler.name, next: scheduler.next }
          : null,
        policyEnabled: policy.enabled,
      };
    } catch (error) {
      return {
        available: false,
        dispatchEnabled: this.enabled(),
        everyMinutes: this.everyMinutes(),
        batchSize: this.batchSize(),
        error: error instanceof Error ? error.message : 'Queue unavailable',
        policyEnabled: policy.enabled,
      };
    }
  }

  async enqueueDue() {
    // MT-8 §11.2: under tenancy the sweep fans out per READY tenant and
    // stamps each job with its organization so the processor resolves the
    // correct database. Legacy mode runs once, envelope-free.
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      const staleBlocked = await this.messages.blockStaleProcessing(
        this.batchSize(),
      );
      const messages = await this.messages.eligibleMessages(this.batchSize());
      await this.queue.addBulk(messages.map(({ id }) => this.jobFor(id)));
      return { queuedCount: messages.length, staleBlocked };
    }

    if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
    let queuedCount = 0;
    let staleBlocked = 0;
    const fanout = await this.fanout.forEachTenant(
      async () => {
        staleBlocked += await this.messages.blockStaleProcessing(
          this.batchSize(),
        );
        const messages = await this.messages.eligibleMessages(this.batchSize());
        const context = tryGetTenantContext();
        await this.queue.addBulk(
          messages.map(({ id }) => this.jobFor(id, context?.organizationId)),
        );
        queuedCount += messages.length;
      },
      { label: 'transactional-message-dispatch' },
    );
    return {
      queuedCount,
      staleBlocked,
      tenantsProcessed: fanout.processed,
      tenantFailures: fanout.failures,
    };
  }

  private jobFor(messageId: string, organizationId?: string) {
    return {
      name: TRANSACTIONAL_MESSAGE_JOB,
      data: {
        messageId,
        ...(organizationId ? { organizationId } : {}),
      },
      // Job IDs embed the org so identical message ids across tenants can
      // never collide or deduplicate each other away.
      opts: {
        jobId: organizationId
          ? `t:${organizationId}:transactional-message-${messageId}`
          : `transactional-message-${messageId}`,
      },
    };
  }

  async retry(messageId: string, actor: UserPayload) {
    if (!this.enabled()) {
      throw new ConflictException(
        'Transactional dispatch is disabled by deployment configuration',
      );
    }
    const policy = await this.messages.getPolicy();
    if (!policy.enabled)
      throw new ConflictException('Transactional routing policy is disabled');
    await this.messages.prepareRetry(messageId);
    const context = tryGetTenantContext();
    if (
      (process.env.TENANCY_ENABLED || 'false') === 'true' &&
      !context?.organizationId
    ) {
      throw new Error('TRANSACTIONAL_MESSAGE_ORGANIZATION_REQUIRED');
    }
    const organizationId = context?.organizationId;
    const job = await this.queue.add(
      TRANSACTIONAL_MESSAGE_JOB,
      { messageId, ...(organizationId ? { organizationId } : {}) },
      {
        jobId: organizationId
          ? `t:${organizationId}:transactional-message-${messageId}-${Date.now()}`
          : `transactional-message-${messageId}-${Date.now()}`,
      },
    );
    await this.audit.record({
      action: 'TRANSACTIONAL_MESSAGE_RETRY_QUEUED',
      entityType: 'CommerceMessage',
      entityId: messageId,
      actor,
      newValue: { jobId: String(job.id) },
    });
    return { messageId, jobId: String(job.id), status: 'QUEUED' as const };
  }

  private enabled() {
    return (
      this.config.get<string>(
        'TRANSACTIONAL_MESSAGE_DISPATCH_ENABLED',
        'false',
      ) === 'true'
    );
  }

  private everyMinutes() {
    return Number(
      this.config.get<string>('TRANSACTIONAL_MESSAGE_SWEEP_EVERY_MINUTES', '5'),
    );
  }

  private batchSize() {
    return Number(
      this.config.get<string>('TRANSACTIONAL_MESSAGE_BATCH_SIZE', '100'),
    );
  }
}
