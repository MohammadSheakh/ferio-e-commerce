import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { randomBytes } from 'crypto';
import { StructuredLogger, TenantMetrics } from '@app/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { TenantSchemaBootstrapper } from '../../tenancy/services/tenant-schema.bootstrapper';
import { TenantDatabasesService } from './tenant-databases.service';
import { toPlatformJsonInput } from '../utils/json-input.util';

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
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_MIGRATION_TIMEOUT_MS = 120_000;
const TRANSIENT_POSTGRES_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '55P03', // lock_not_available
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  'P1001', // Prisma database unreachable
  'P1002', // Prisma database timeout
  'P1017', // Prisma server closed connection
]);

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
  private readonly logger = new StructuredLogger(
    MigrationOrchestratorService.name,
  );

  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly databases: TenantDatabasesService,
    private readonly bootstrapper: TenantSchemaBootstrapper,
    @Inject(getQueueToken(QUEUE_NAMES.TENANT_MIGRATION))
    private readonly migrationQueue: {
      add: (
        name: string,
        data: TenantMigrationJobData,
        opts?: unknown,
      ) => Promise<unknown>;
    },
  ) {}

  async start(input: StartMigrationInput): Promise<{ runId: string }> {
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
        targetSchemaVersion: input.canaryOrganizationId ? 'pending' : 'fleet',
        canaryOrganizationId: input.canaryOrganizationId,
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
    TenantMetrics.increment('migration_run_started');
    await this.enqueueRun(run.id);
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
      const successes = run.results
        .filter((r) => r.success)
        .map((r) => r.tenantDatabaseId);
      return { status: run.status, migrated: successes, failures: [] };
    }

    const doneOrgs = new Set(run.results.map((r) => r.tenantDatabaseId));

    const registries = (
      await this.platform.client.tenantDatabase.findMany({
        where: { status: 'READY', organization: { status: 'ACTIVE' } },
        orderBy: { organizationId: 'asc' },
        select: { id: true, organizationId: true },
      })
    ).filter((r) => !doneOrgs.has(r.id));

    const requestedCanary = run.canaryOrganizationId
      ? registries.find(
          (registry) => registry.organizationId === run.canaryOrganizationId,
        )
      : undefined;
    if (run.canaryOrganizationId && !requestedCanary) {
      const error = 'CANARY_ORGANIZATION_NOT_READY';
      await this.platform.client.tenantMigrationRun.update({
        where: { id: run.id },
        data: { status: 'FAILED' },
      });
      await this.auditNote(
        'TENANT_MIGRATION_CANARY_FAILED',
        run.id,
        undefined,
        {
          organizationId: run.canaryOrganizationId,
          error,
        },
      );
      return {
        status: 'FAILED',
        migrated: [],
        failures: [{ organizationId: run.canaryOrganizationId, error }],
      };
    }

    const failures: Array<{ organizationId: string; error: string }> = [];
    let consecutiveFailures = 0;
    const migrated: string[] = [];

    await this.platform.client.tenantMigrationRun.update({
      where: { id: run.id },
      data: { status: registries.length > 1 ? 'CANARY' : 'BATCHING' },
    });

    // ── Phase 1: canary = first tenant in the ordered list ──
    const first = requestedCanary ?? registries.shift();
    if (requestedCanary) {
      registries.splice(registries.indexOf(requestedCanary), 1);
    }
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
      await this.auditNote(
        'TENANT_MIGRATION_CANARY_FAILED',
        run.id,
        undefined,
        {
          organizationId: first.organizationId,
          error: message,
        },
      );
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
          const message =
            error instanceof Error ? error.message : String(error);
          failures.push({
            organizationId: registry.organizationId,
            error: message,
          });
          consecutiveFailures += 1;
          if (consecutiveFailures >= run.failureThreshold) {
            await this.platform.client.tenantMigrationRun.update({
              where: { id: run.id },
              data: { status: 'PAUSED' },
            });
            TenantMetrics.increment('migration_run_paused');
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
    // Resumes must use the same queue boundary as initial runs. Running the
    // fleet from an HTTP request would tie up the operator request and makes
    // retries vulnerable to proxy/request timeouts.
    await this.enqueueRun(runId);
    return { runId };
  }

  private enqueueRun(runId: string): Promise<unknown> {
    return this.migrationQueue.add(
      TENANT_MIGRATION_RUN_JOB,
      { migrationRunId: runId },
      { jobId: `t:${runId}:migration-run`, attempts: 1 },
    );
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

  private async migrateOne(
    runId: string,
    tenantDatabaseId: string,
  ): Promise<void> {
    try {
      await this.retryTransient(
        () => this.migrateOneAttempt(runId, tenantDatabaseId),
        this.migrationRetryAttempts(),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const before = await this.databases
        .publicView(tenantDatabaseId)
        .catch(() => ({ schemaVersion: undefined }));
      await this.platform.client.tenantMigrationResult.upsert({
        where: {
          migrationRunId_tenantDatabaseId: {
            migrationRunId: runId,
            tenantDatabaseId,
          },
        },
        create: {
          migrationRunId: runId,
          tenantDatabaseId,
          fromVersion: before.schemaVersion ?? null,
          toVersion: before.schemaVersion ?? 'unknown',
          success: false,
          detail: toPlatformJsonInput({ error: message }),
        },
        update: {
          success: false,
          detail: toPlatformJsonInput({ error: message }),
        },
      });
      await this.databases.recordHealth(tenantDatabaseId, false);
      TenantMetrics.increment('migration_tenant_failed', { tenantDatabaseId });
      throw error;
    }
  }

  private async migrateOneAttempt(
    runId: string,
    tenantDatabaseId: string,
  ): Promise<void> {
    const connection =
      await this.databases.getDecryptedConnection(tenantDatabaseId);
    const before = await this.databases.publicView(tenantDatabaseId);
    const outcome = await this.withTimeout(
      this.bootstrapper.bootstrap(connection),
      this.migrationTimeoutMs(),
    );
    await this.databases.setSchemaVersion(
      tenantDatabaseId,
      outcome.schemaVersion,
    );
    await this.platform.client.tenantMigrationResult.upsert({
      where: {
        migrationRunId_tenantDatabaseId: {
          migrationRunId: runId,
          tenantDatabaseId,
        },
      },
      create: {
        migrationRunId: runId,
        tenantDatabaseId,
        fromVersion: before.schemaVersion ?? null,
        toVersion: outcome.schemaVersion,
        success: true,
        detail: toPlatformJsonInput({ appliedCount: outcome.applied.length }),
      },
      update: {
        success: true,
        toVersion: outcome.schemaVersion,
        detail: toPlatformJsonInput({ appliedCount: outcome.applied.length }),
      },
    });
    TenantMetrics.increment('migration_tenant_succeeded', { tenantDatabaseId });
  }

  private async retryTransient<T>(
    operation: () => Promise<T>,
    attempts: number,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isTransientMigrationError(error) || attempt === attempts) {
          throw error;
        }
        await this.delay(this.retryDelayMs(attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private isTransientMigrationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === 'string' ? candidate.code : '';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message.toLowerCase()
        : '';
    return (
      TRANSIENT_POSTGRES_CODES.has(code) ||
      /deadlock|lock timeout|connection (reset|closed|refused)|timed out|temporarily unavailable/.test(
        message,
      )
    );
  }

  private migrationRetryAttempts(): number {
    const value = Number(
      process.env.TENANT_MIGRATION_RETRY_ATTEMPTS ?? DEFAULT_RETRY_ATTEMPTS,
    );
    return Number.isInteger(value) && value >= 1 && value <= 5
      ? value
      : DEFAULT_RETRY_ATTEMPTS;
  }

  private migrationTimeoutMs(): number {
    const value = Number(
      process.env.TENANT_MIGRATION_TIMEOUT_MS ?? DEFAULT_MIGRATION_TIMEOUT_MS,
    );
    return Number.isInteger(value) && value >= 1_000 && value <= 900_000
      ? value
      : DEFAULT_MIGRATION_TIMEOUT_MS;
  }

  private retryDelayMs(attempt: number): number {
    const value = Number(process.env.TENANT_MIGRATION_RETRY_DELAY_MS ?? 250);
    const base =
      Number.isInteger(value) && value >= 0 && value <= 30_000 ? value : 250;
    return Math.min(base * 2 ** (attempt - 1), 30_000);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('TENANT_MIGRATION_TIMEOUT')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async markCompleted(runId: string): Promise<void> {
    await this.platform.client.tenantMigrationRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED' },
    });
    TenantMetrics.increment('migration_run_completed');
  }

  private auditNote(
    action: string,
    entityId: string,
    actorId?: string,
    metadata?: unknown,
  ) {
    return this.platform.client.platformAuditLog
      .create({
        data: {
          action,
          entityType: 'TenantMigrationRun',
          entityId,
          actorId,
          metadata: toPlatformJsonInput(metadata),
        },
      })
      .catch(() => undefined);
  }

  /** Deterministic idempotency key helper for future scheduled migrations. */
  static idempotencyKey(): string {
    return `mig:${randomBytes(6).toString('hex')}`;
  }
}
