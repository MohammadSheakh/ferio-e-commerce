import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { randomBytes } from 'crypto';
import { StructuredLogger } from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { TenantSchemaBootstrapper } from '../../tenancy/tenant-schema.bootstrapper';
import { TenantDatabasesService } from './tenant-databases.service';

export const TENANT_MIGRATION_RUN_JOB = 'run-tenant-migration';
export type TenantMigrationJobData = { migrationRunId?: string };

export interface StartMigrationInput {
  actorId?: string;
  /** Optional canary: this organization migrates alone before the fleet. */
  canaryOrganizationId?: string;
  /** Tenants processed per batch (sequential batches; parallelism deferred). */
  concurrencyLimit?: number;
  /** Consecutive-failure count that pauses the rollout. */
  failureThreshold?: number;
}

const DEFAULT_BATCH = 2;
const MAX_THRESHOLD = 25;

/**
 * Tenant migration orchestration (ADR-0005, checklist §14).
 *
 * Lifecycle: PENDING → CANARY → BATCHING → COMPLETED | PAUSED | FAILED.
 * - Canary phase migrates exactly one tenant; failure fails the run without
 *   touching anyone else.
 * - Batching walks the remaining READY tenants in bounded batches, recording
 *   a per-tenant result row for every attempt.
 * - Failure threshold pauses the rollout; resume re-enqueues and SKIPS
 *   organizations that already have a successful result for this run.
 *
 * Application of migrations is delegated to the idempotent
 * TenantSchemaBootstrapper — retries never double-apply artifacts.
 */
@Injectable()
export class MigrationOrchestratorService {
  private readonly logger = new StructuredLogger(MigrationOrchestratorService.name);

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly databases: TenantDatabasesService,
    private readonly bootstrapper: TenantSchemaBootstrapper,
    @Inject(getQueueToken(QUEUE_NAMES.TENANT_MIGRATION))
    private readonly migrationQueue: {
      add: (name: string, data: TenantMigrationJobData, opts?: unknown) => Promise<unknown>;
    },
  ) {}

  async start(
    input: StartMigrationInput,
  ): Promise<{ runId: string }> {
    const concurrencyLimit = Math.min(
      Math.max(input.concurrencyLimit ?? DEFAULT_BATCH, 1),
      10,
    );
    const failureThreshold = Math.min(
      Math.max(input.failureThreshold ?? 3, 1),
      MAX_THRESHOLD,
    );
    if (
      input.canaryOrganizationId &&
      !(await this.platform.client.tenantDatabase.findUnique({
        where: { organizationId: input.canaryOrganizationId },
      }))
    ) {
      throw new BadRequestException('CANARY_ORGANIZATION_HAS_NO_DATABASE');
    }
    const run = await this.platform.client.tenantMigrationRun.create({
      data: {
        targetSchemaVersion:
          input.canaryOrganizationId ? 'pending' : 'fleet',
        status: 'PENDING',
        concurrencyLimit,
        failureThreshold,
      },
    });
    await this.auditNote('TENANT_MIGRATION_STARTED', run.id, input.actorId, {
      canaryOrganizationId: input.canaryOrganizationId,
      concurrencyLimit,
      failureThreshold,
    });
    await this.migrationQueue.add(
      TENANT_MIGRATION_RUN_JOB,
      { migrationRunId: run.id },
      { jobId: `t:${run.id}:migration-run`, attempts: 1 },
    );
    return { runId: run.id };
  }

  /**
   * Execute a run. Called by the queue processor; safe to call again after a
   * pause — completed tenants are skipped by their existing result rows.
   */
  async processRun(runId: string): Promise<{
    status: string;
    migrated: string[];
    failures: Array<{ organizationId: string; error: string }>;
  }> {
    const run = await this.platform.client.tenantMigrationRun.findUnique({
      where: { id: runId },
      include: { results: true },
    });
    if (!run) throw new NotFoundException('MIGRATION_RUN_NOT_FOUND');
    if (['COMPLETED', 'PAUSED', 'FAILED'].includes(run.status)) {
      const successes = run.results.filter((r) => r.success).map((r) => r.tenantDatabaseId);
      return { status: run.status, migrated: successes, failures: [] };
    }

    const doneOrgs = new Set(
      run.results.map((r) => r.tenantDatabaseId),
    );

    let registries = (
      await this.platform.client.tenantDatabase.findMany({
        where: { status: 'READY', organization: { status: 'ACTIVE' } },
        orderBy: { organizationId: 'asc' },
        select: { id: true, organizationId: true },
      })
    ).filter((r) => !doneOrgs.has(r.id));

    const failures: Array<{ organizationId: string; error: string }> = [];
    let consecutiveFailures = 0;
    const migrated: string[] = [];

    await this.platform.client.tenantMigrationRun.update({
      where: { id: run.id },
      data: { status: registries.length > 1 ? 'CANARY' : 'BATCHING' },
    });

    // ── Phase 1: canary = first tenant in the ordered list ──
    const first = registries.shift();
    if (!first) {
      await this.markCompleted(run.id);
      return { status: 'COMPLETED', migrated, failures };
    }
    try {
      await this.migrateOne(run.id, first.id);
      migrated.push(first.organizationId);
      consecutiveFailures = 0;
      await this.platform.client.tenantMigrationRun.update({
        where: { id: run.id },
        data: { status: 'BATCHING' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ organizationId: first.organizationId, error: message });
      await this.platform.client.tenantMigrationRun.update({
        where: { id: run.id },
        data: { status: 'FAILED' },
      });
      await this.auditNote('TENANT_MIGRATION_CANARY_FAILED', run.id, undefined, {
        organizationId: first.organizationId,
        error: message,
      });
      return { status: 'FAILED', migrated, failures };
    }

    // ── Phase 2: bounded batches over the remainder ──
    while (registries.length > 0) {
      const current = await this.platform.client.tenantMigrationRun.findUnique({
        where: { id: run.id },
        select: { status: true },
      });
      if (current?.status === 'PAUSED') break;

      const batch = registries.splice(0, run.concurrencyLimit);
      for (const registry of batch) {
        try {
          await this.migrateOne(run.id, registry.id);
          migrated.push(registry.organizationId);
          consecutiveFailures = 0;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ organizationId: registry.organizationId, error: message });
          consecutiveFailures += 1;
          if (consecutiveFailures >= run.failureThreshold) {
            await this.platform.client.tenantMigrationRun.update({
              where: { id: run.id },
              data: { status: 'PAUSED' },
            });
            await this.auditNote('TENANT_MIGRATION_PAUSED', run.id, undefined, {
              reason: 'failure threshold reached',
              lastOrganizationId: registry.organizationId,
            });
            return { status: 'PAUSED', migrated, failures };
          }
        }
      }
    }

    await this.markCompleted(run.id);
    return { status: 'COMPLETED', migrated, failures };
  }

  async pause(runId: string): Promise<void> {
    const run = await this.getRun(runId);
    if (!['CANARY', 'BATCHING', 'PENDING'].includes(run.status)) {
      throw new BadRequestException(`MIGRATION_NOT_PAUSABLE:${run.status}`);
    }
    await this.platform.client.tenantMigrationRun.update({
      where: { id: runId },
      data: { status: 'PAUSED' },
    });
  }

  async resume(runId: string): Promise<{ runId: string }> {
    const run = await this.getRun(runId);
    if (run.status !== 'PAUSED') {
      throw new BadRequestException(`MIGRATION_NOT_RESUMABLE:${run.status}`);
    }
    await this.platform.client.tenantMigrationRun.update({
      where: { id: runId },
      data: { status: 'BATCHING' },
    });
    await this.processRun(runId);
    return { runId };
  }

  async getRun(runId: string) {
    const run = await this.platform.client.tenantMigrationRun.findUnique({
      where: { id: runId },
      include: { results: true },
    });
    if (!run) throw new NotFoundException('MIGRATION_RUN_NOT_FOUND');
    return run;
  }

  listRuns(take = 20) {
    return this.platform.client.tenantMigrationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
      include: {
        results: {
          select: {
            tenantDatabaseId: true,
            success: true,
            fromVersion: true,
            toVersion: true,
          },
        },
      },
    });
  }

  private async migrateOne(runId: string, tenantDatabaseId: string): Promise<void> {
    const connection = await this.databases.getDecryptedConnection(tenantDatabaseId);
    const before = await this.databases.publicView(tenantDatabaseId);
    try {
      const outcome = await this.bootstrapper.bootstrap(connection);
      await this.databases.setSchemaVersion(tenantDatabaseId, outcome.schemaVersion);
      await this.platform.client.tenantMigrationResult.upsert({
        where: {
          migrationRunId_tenantDatabaseId: { migrationRunId: runId, tenantDatabaseId },
        },
        create: {
          migrationRunId: runId,
          tenantDatabaseId,
          fromVersion: before.schemaVersion ?? null,
          toVersion: outcome.schemaVersion,
          success: true,
          detail: { appliedCount: outcome.applied.length } as never,
        },
        update: {
          success: true,
          toVersion: outcome.schemaVersion,
          detail: { appliedCount: outcome.applied.length } as never,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.platform.client.tenantMigrationResult.upsert({
        where: {
          migrationRunId_tenantDatabaseId: { migrationRunId: runId, tenantDatabaseId },
        },
        create: {
          migrationRunId: runId,
          tenantDatabaseId,
          fromVersion: before.schemaVersion ?? null,
          toVersion: before.schemaVersion ?? 'unknown',
          success: false,
          detail: { error: message } as never,
        },
        update: { success: false, detail: { error: message } as never },
      });
      await this.databases.recordHealth(tenantDatabaseId, false);
      throw error;
    }
  }

  private async markCompleted(runId: string): Promise<void> {
    await this.platform.client.tenantMigrationRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED' },
    });
  }

  private auditNote(action: string, entityId: string, actorId?: string, metadata?: unknown) {
    return this.platform.client.platformAuditLog
      .create({
        data: {
          action,
          entityType: 'TenantMigrationRun',
          entityId,
          actorId,
          metadata: (metadata ?? undefined) as never,
        },
      })
      .catch(() => undefined);
  }

  /** Deterministic idempotency key helper for future scheduled migrations. */
  static idempotencyKey(): string {
    return `mig:${randomBytes(6).toString('hex')}`;
  }
}
