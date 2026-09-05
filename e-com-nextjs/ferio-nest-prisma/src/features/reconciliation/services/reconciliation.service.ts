import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma, ReconciliationFindingType } from '@prisma/client';
import type { UserPayload } from '@app/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  ReconciliationActionDto,
  ReconciliationQueryDto,
  RunReconciliationDto,
} from '../dto/reconciliation.dto';
import { buildOperationalAlerts } from '../utils/operational-alert.util';

type FindingInput = {
  type: ReconciliationFindingType;
  domain: 'INVENTORY' | 'PAYMENT' | 'SHIPPING' | 'REFUND' | 'SETTLEMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  context: Prisma.InputJsonValue;
};

type RunTrigger = 'MANUAL' | 'SCHEDULED' | 'RETRY';

type ExecuteRunInput = {
  runId: string;
  overdueHours: number;
  trigger: RunTrigger;
  actor?: UserPayload;
  initiatedByActorId?: string;
  queueJobId?: string;
};

const scannedTypes = [
  'DELIVERED_COD_MISSING_COLLECTION',
  'OVERDUE_COD_COLLECTION',
  'RTO_WITH_COLLECTION',
  'COD_COLLECTION_VARIANCE',
  'COURIER_SETTLEMENT_VARIANCE',
  'COD_PAYMENT_STATE_MISMATCH',
  'PREPAID_PAYMENT_STATE_MISMATCH',
  'PREPAID_UNVERIFIED_PAID_ORDER',
  'PREPAID_AMOUNT_MISMATCH',
  'TERMINAL_ORDER_ACTIVE_RESERVATION',
  'INVALID_STOCK_BALANCE',
  'AGED_PENDING_REFUND',
] satisfies ReconciliationFindingType[];

const operationalRunSelect = {
  id: true,
  reference: true,
  status: true,
  trigger: true,
  overdueHours: true,
  detectedCount: true,
  openedCount: true,
  autoResolvedCount: true,
  initiatedByActorId: true,
  queueJobId: true,
  attemptCount: true,
  startedAt: true,
  lastAttemptAt: true,
  completedAt: true,
  failureReason: true,
} satisfies Prisma.ReconciliationRunSelect;

function groupedCount(entry: unknown, field: string): number {
  if (!entry || typeof entry !== 'object') return 0;
  const count = (entry as { _count?: unknown })._count;
  if (!count || typeof count !== 'object') return 0;
  const value = (count as Record<string, unknown>)[field];
  return typeof value === 'number' ? value : 0;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7/MT-8: inside a tenant-resolved request or worker fan-out this
   * returns the resolved tenant database client; outside one it explicitly
   * falls back to the legacy single-tenant DB. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }
  async list(query: ReconciliationQueryDto) {
    const db = await this.db();
    const where: Prisma.ReconciliationFindingWhereInput = {
      domain: query.domain,
      severity: query.severity,
      status: query.status,
    };
    const [items, total, open, acknowledged, resolved] =
      await db.$transaction([
        db.reconciliationFinding.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
        }),
        db.reconciliationFinding.count({ where }),
        db.reconciliationFinding.count({
          where: { ...where, status: 'OPEN' },
        }),
        db.reconciliationFinding.count({
          where: { ...where, status: 'ACKNOWLEDGED' },
        }),
        db.reconciliationFinding.count({
          where: { ...where, status: 'RESOLVED' },
        }),
      ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      summary: { OPEN: open, ACKNOWLEDGED: acknowledged, RESOLVED: resolved },
    };
  }

  async getOperationalAlerts() {
    const db = await this.db();
    const now = new Date();
    const recentSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleWebhookBefore = new Date(now.getTime() - 15 * 60 * 1000);
    const [
      findings,
      payments,
      webhookErrors,
      staleWebhooks,
      polls,
      messages,
      refunds,
      runs,
    ] = await db.$transaction([
      db.reconciliationFinding.groupBy({
        by: ['severity'],
        orderBy: { severity: 'asc' },
        where: {
          status: { not: 'RESOLVED' },
          severity: { in: ['CRITICAL', 'HIGH'] },
        },
        _count: { severity: true },
        _min: { firstDetectedAt: true },
        _max: { lastSeenAt: true },
      }),
      db.commercePaymentAttempt.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: {
          status: { in: ['FAILED', 'UNKNOWN'] },
          createdAt: { gte: recentSince },
        },
        _count: { status: true },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),
      db.shipmentWebhookLog.aggregate({
        where: {
          processingError: { not: null },
          receivedAt: { gte: recentSince },
        },
        _count: { _all: true },
        _min: { receivedAt: true },
        _max: { lastAttemptAt: true },
      }),
      db.shipmentWebhookLog.aggregate({
        where: {
          authValid: true,
          processed: false,
          processingError: null,
          receivedAt: { gte: recentSince, lte: staleWebhookBefore },
        },
        _count: { _all: true },
        _min: { receivedAt: true },
        _max: { receivedAt: true },
      }),
      db.shipmentPollAttempt.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: { status: 'FAILED', createdAt: { gte: recentSince } },
        _count: { status: true },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),
      db.commerceMessage.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: {
          status: { in: ['FAILED', 'BLOCKED'] },
          createdAt: { gte: recentSince },
        },
        _count: { status: true },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),
      db.commerceRefund.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: { status: 'FAILED', createdAt: { gte: recentSince } },
        _count: { status: true },
        _min: { createdAt: true },
        _max: { updatedAt: true },
      }),
      db.reconciliationRun.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: { status: 'FAILED', createdAt: { gte: recentSince } },
        _count: { status: true },
        _min: { createdAt: true },
        _max: { completedAt: true },
      }),
    ]);

    const finding = (severity: 'CRITICAL' | 'HIGH') =>
      findings.find((entry) => entry.severity === severity);
    const payment = (status: 'FAILED' | 'UNKNOWN') =>
      payments.find((entry) => entry.status === status);
    const pollFailed = polls.find((entry) => entry.status === 'FAILED');
    const message = (status: 'FAILED' | 'BLOCKED') =>
      messages.find((entry) => entry.status === status);
    const refundFailed = refunds.find((entry) => entry.status === 'FAILED');
    const runFailed = runs.find((entry) => entry.status === 'FAILED');
    const alerts = buildOperationalAlerts([
      {
        code: 'RECONCILIATION_CRITICAL',
        severity: 'CRITICAL',
        title: 'Critical reconciliation findings',
        detail: 'Unresolved cross-domain inconsistencies require owner review.',
        count: groupedCount(finding('CRITICAL'), 'severity'),
        oldestAt: finding('CRITICAL')?._min?.firstDetectedAt ?? null,
        latestAt: finding('CRITICAL')?._max?.lastSeenAt ?? null,
        actionHref: '/dashboard/reconciliation',
        actionLabel: 'Review findings',
      },
      {
        code: 'PAYMENT_OUTCOME_UNKNOWN',
        severity: 'CRITICAL',
        title: 'Payment outcomes are unknown',
        detail:
          'Verify provider evidence before retrying to avoid duplicate collection.',
        count: groupedCount(payment('UNKNOWN'), 'status'),
        oldestAt: payment('UNKNOWN')?._min?.createdAt ?? null,
        latestAt: payment('UNKNOWN')?._max?.updatedAt ?? null,
        actionHref: '/dashboard/payments',
        actionLabel: 'Review payments',
      },
      {
        code: 'RECONCILIATION_HIGH',
        severity: 'HIGH',
        title: 'High-severity reconciliation findings',
        detail:
          'Open or acknowledged findings still require resolution evidence.',
        count: groupedCount(finding('HIGH'), 'severity'),
        oldestAt: finding('HIGH')?._min?.firstDetectedAt ?? null,
        latestAt: finding('HIGH')?._max?.lastSeenAt ?? null,
        actionHref: '/dashboard/reconciliation',
        actionLabel: 'Review findings',
      },
      {
        code: 'PAYMENTS_FAILED_RECENTLY',
        severity: 'HIGH',
        title: 'Payment attempts failed recently',
        detail:
          'Review failure codes and provider availability before customer retry.',
        count: groupedCount(payment('FAILED'), 'status'),
        oldestAt: payment('FAILED')?._min?.createdAt ?? null,
        latestAt: payment('FAILED')?._max?.updatedAt ?? null,
        actionHref: '/dashboard/payments',
        actionLabel: 'Review payments',
      },
      {
        code: 'COURIER_WEBHOOK_ERRORS',
        severity: 'HIGH',
        title: 'Courier callbacks failed processing',
        detail:
          'Authenticated or rejected callback evidence needs operational review.',
        count: webhookErrors._count._all,
        oldestAt: webhookErrors._min.receivedAt,
        latestAt: webhookErrors._max.lastAttemptAt,
        actionHref: '/dashboard/shipping',
        actionLabel: 'Review callbacks',
      },
      {
        code: 'COURIER_WEBHOOK_STALLED',
        severity: 'HIGH',
        title: 'Courier callbacks are stalled',
        detail:
          'Authenticated callbacks have remained unprocessed for more than 15 minutes.',
        count: staleWebhooks._count._all,
        oldestAt: staleWebhooks._min.receivedAt,
        latestAt: staleWebhooks._max.receivedAt,
        actionHref: '/dashboard/shipping',
        actionLabel: 'Review callbacks',
      },
      {
        code: 'COURIER_POLLS_FAILED',
        severity: 'HIGH',
        title: 'Courier status polls failed',
        detail: 'Polling fallback could not retrieve shipment status.',
        count: groupedCount(pollFailed, 'status'),
        oldestAt: pollFailed?._min?.createdAt ?? null,
        latestAt: pollFailed?._max?.updatedAt ?? null,
        actionHref: '/dashboard/shipping',
        actionLabel: 'Review polling',
      },
      {
        code: 'MESSAGES_BLOCKED',
        severity: 'HIGH',
        title: 'Transactional messages are blocked',
        detail: 'Uncertain provider outcomes stopped automatic fallback.',
        count: groupedCount(message('BLOCKED'), 'status'),
        oldestAt: message('BLOCKED')?._min?.createdAt ?? null,
        latestAt: message('BLOCKED')?._max?.updatedAt ?? null,
        actionHref: '/dashboard/messages',
        actionLabel: 'Review messages',
      },
      {
        code: 'REFUNDS_FAILED_RECENTLY',
        severity: 'HIGH',
        title: 'Refund attempts failed recently',
        detail: 'Customer resolution is incomplete and requires review.',
        count: groupedCount(refundFailed, 'status'),
        oldestAt: refundFailed?._min?.createdAt ?? null,
        latestAt: refundFailed?._max?.updatedAt ?? null,
        actionHref: '/dashboard/returns',
        actionLabel: 'Review returns',
      },
      {
        code: 'RECONCILIATION_RUNS_FAILED',
        severity: 'HIGH',
        title: 'Reconciliation scans failed',
        detail:
          'Automated inconsistency detection did not complete successfully.',
        count: groupedCount(runFailed, 'status'),
        oldestAt: runFailed?._min?.createdAt ?? null,
        latestAt: runFailed?._max?.completedAt ?? null,
        actionHref: '/dashboard/reconciliation',
        actionLabel: 'Review scan health',
      },
      {
        code: 'MESSAGES_FAILED_RECENTLY',
        severity: 'MEDIUM',
        title: 'Transactional messages failed recently',
        detail: 'Definitive channel failures exhausted the configured route.',
        count: groupedCount(message('FAILED'), 'status'),
        oldestAt: message('FAILED')?._min?.createdAt ?? null,
        latestAt: message('FAILED')?._max?.updatedAt ?? null,
        actionHref: '/dashboard/messages',
        actionLabel: 'Review messages',
      },
    ]);
    return {
      generatedAt: now,
      windowHours: 24,
      staleWebhookMinutes: 15,
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((alert) => alert.severity === 'CRITICAL')
          .length,
        high: alerts.filter((alert) => alert.severity === 'HIGH').length,
        medium: alerts.filter((alert) => alert.severity === 'MEDIUM').length,
      },
    };
  }

  async run(
    rawIdempotencyKey: string | undefined,
    dto: RunReconciliationDto,
    actor: UserPayload,
  ) {
    return this.createAndExecuteRun(rawIdempotencyKey, dto.overdueHours, {
      trigger: 'MANUAL',
      actor,
      initiatedByActorId: actor.userId,
    });
  }

  async runScheduled(overdueHours: number, queueJobId: string) {
    return this.createAndExecuteRun(
      `reconciliation-scheduled-job:${queueJobId}`,
      overdueHours,
      { trigger: 'SCHEDULED', queueJobId },
    );
  }

  async retryRun(
    runId: string,
    queueJobId: string,
    initiatedByActorId?: string,
  ) {
    const db = await this.db();
    const run = await db.reconciliationRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('Reconciliation run not found');
    if (run.status !== 'FAILED')
      throw new ConflictException('Only failed reconciliation runs can retry');
    return this.executeRun({
      runId,
      overdueHours: run.overdueHours,
      trigger: 'RETRY',
      initiatedByActorId,
      queueJobId,
    });
  }

  async recentRuns(limit = 10) {
    const db = await this.db();
    return db.reconciliationRun.findMany({
      take: Math.min(Math.max(limit, 1), 50),
      orderBy: { startedAt: 'desc' },
      select: operationalRunSelect,
    });
  }

  async operationsSummary(windowHours = 24) {
    const db = await this.db();
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const [lastSuccess, lastFailure, completedCount, failedCount, timedRuns] =
      await Promise.all([
        db.reconciliationRun.findFirst({
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          select: operationalRunSelect,
        }),
        db.reconciliationRun.findFirst({
          where: { status: 'FAILED' },
          orderBy: { completedAt: 'desc' },
          select: operationalRunSelect,
        }),
        db.reconciliationRun.count({
          where: { status: 'COMPLETED', completedAt: { gte: since } },
        }),
        db.reconciliationRun.count({
          where: { status: 'FAILED', completedAt: { gte: since } },
        }),
        db.reconciliationRun.findMany({
          where: {
            status: { in: ['COMPLETED', 'FAILED'] },
            completedAt: { gte: since, not: null },
          },
          select: { startedAt: true, completedAt: true },
        }),
      ]);
    const durations = timedRuns
      .filter((run) => run.completedAt)
      .map((run) => run.completedAt!.getTime() - run.startedAt.getTime());
    const totalCount = completedCount + failedCount;
    return {
      windowHours,
      completedCount,
      failedCount,
      successRate:
        totalCount === 0
          ? null
          : Math.round((completedCount / totalCount) * 100),
      averageDurationMs:
        durations.length === 0
          ? null
          : Math.round(
              durations.reduce((total, duration) => total + duration, 0) /
                durations.length,
            ),
      lastSuccess,
      lastFailure,
    };
  }

  async getRetryableRun(id: string) {
    const db = await this.db();
    const run = await db.reconciliationRun.findUnique({
      where: { id },
    });
    if (!run) throw new NotFoundException('Reconciliation run not found');
    if (run.status !== 'FAILED')
      throw new ConflictException('Only failed reconciliation runs can retry');
    return run;
  }

  private async createAndExecuteRun(
    rawIdempotencyKey: string | undefined,
    overdueHours: number,
    input: Omit<ExecuteRunInput, 'runId' | 'overdueHours'>,
  ) {
    const db = await this.db();
    const idempotencyKeyHash = this.idempotencyHash(rawIdempotencyKey);
    const duplicate = await db.reconciliationRun.findUnique({
      where: { idempotencyKeyHash },
    });
    if (duplicate) {
      if (duplicate.status !== 'FAILED') return duplicate;
      return this.executeRun({
        ...input,
        runId: duplicate.id,
        overdueHours: duplicate.overdueHours,
      });
    }
    let run;
    try {
      run = await db.reconciliationRun.create({
        data: {
          reference: this.runReference(),
          idempotencyKeyHash,
          trigger: input.trigger,
          overdueHours,
          initiatedByActorId: input.initiatedByActorId,
          queueJobId: input.queueJobId,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      if (error.code !== 'P2002') throw error;
      const concurrent = await db.reconciliationRun.findUnique({
        where: { idempotencyKeyHash },
      });
      if (!concurrent) throw error;
      return concurrent;
    }
    return this.executeRun({ ...input, runId: run.id, overdueHours });
  }

  private async executeRun(input: ExecuteRunInput) {
    const db = await this.db();
    const startedAt = new Date();
    await db.reconciliationRun.update({
      where: { id: input.runId },
      data: {
        status: 'RUNNING',
        trigger: input.trigger,
        initiatedByActorId: input.initiatedByActorId,
        queueJobId: input.queueJobId,
        attemptCount: { increment: 1 },
        startedAt,
        lastAttemptAt: startedAt,
        completedAt: null,
        failureReason: null,
      },
    });
    try {
      return await db.$transaction(
        async (transaction) => {
          const findings = await this.detect(
            transaction,
            input.overdueHours,
            startedAt,
          );
          const fingerprints = findings.map((finding) =>
            this.fingerprint(finding),
          );
          const existing = await transaction.reconciliationFinding.findMany({
            where: { fingerprint: { in: fingerprints } },
            select: { fingerprint: true, status: true },
          });
          const existingMap = new Map(
            existing.map((finding) => [finding.fingerprint, finding.status]),
          );
          let openedCount = 0;
          for (const finding of findings) {
            const fingerprint = this.fingerprint(finding);
            const currentStatus = existingMap.get(fingerprint);
            if (!currentStatus || currentStatus === 'RESOLVED')
              openedCount += 1;
            await transaction.reconciliationFinding.upsert({
              where: { fingerprint },
              create: {
                ...finding,
                fingerprint,
                context: finding.context,
                firstDetectedAt: startedAt,
                lastSeenAt: startedAt,
              },
              update: {
                type: finding.type,
                domain: finding.domain,
                severity: finding.severity,
                title: finding.title,
                description: finding.description,
                entityType: finding.entityType,
                entityId: finding.entityId,
                context: finding.context,
                lastSeenAt: startedAt,
                occurrenceCount: { increment: 1 },
                ...(currentStatus === 'RESOLVED'
                  ? {
                      status: 'OPEN' as const,
                      acknowledgedByActorId: null,
                      acknowledgedAt: null,
                      acknowledgementNote: null,
                      resolvedByActorId: null,
                      resolvedAt: null,
                      resolutionNote: null,
                    }
                  : {}),
              },
            });
          }
          const autoResolved =
            await transaction.reconciliationFinding.updateMany({
              where: {
                type: { in: scannedTypes },
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                fingerprint: fingerprints.length
                  ? { notIn: fingerprints }
                  : undefined,
                lastSeenAt: { lt: startedAt },
              },
              data: {
                status: 'RESOLVED',
                resolvedAt: startedAt,
                resolutionNote:
                  'Condition no longer detected by reconciliation scan',
              },
            });
          const completed = await transaction.reconciliationRun.update({
            where: { id: input.runId },
            data: {
              status: 'COMPLETED',
              detectedCount: findings.length,
              openedCount,
              autoResolvedCount: autoResolved.count,
              completedAt: new Date(),
            },
          });
          await this.audit.record(
            {
              action: 'RECONCILIATION_SCAN_COMPLETED',
              entityType: 'ReconciliationRun',
              entityId: input.runId,
              actor: input.actor,
              source: input.actor ? 'ADMIN_API' : 'JOB',
              newValue: completed,
            },
            transaction,
          );
          return completed;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error';
      const failed = await db.reconciliationRun.update({
        where: { id: input.runId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          failureReason,
        },
      });
      await this.audit.record({
        action: 'RECONCILIATION_SCAN_FAILED',
        entityType: 'ReconciliationRun',
        entityId: input.runId,
        actor: input.actor,
        source: input.actor ? 'ADMIN_API' : 'JOB',
        newValue: failed,
        metadata: { failureReason, queueJobId: input.queueJobId },
      });
      throw error;
    }
  }

  async action(id: string, dto: ReconciliationActionDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(async (transaction) => {
      const previous = await transaction.reconciliationFinding.findUnique({
        where: { id },
      });
      if (!previous)
        throw new NotFoundException('Reconciliation finding not found');
      const now = new Date();
      const note = dto.note.normalize('NFKC').trim();
      if (dto.action === 'ACKNOWLEDGE' && previous.status === 'RESOLVED') {
        throw new ConflictException('Resolved finding must be reopened first');
      }
      if (dto.action === 'RESOLVE' && previous.status === 'RESOLVED') {
        throw new ConflictException('Finding is already resolved');
      }
      const data: Prisma.ReconciliationFindingUpdateInput =
        dto.action === 'CLAIM'
          ? { ownerActorId: actor.userId }
          : dto.action === 'ACKNOWLEDGE'
            ? {
                status: 'ACKNOWLEDGED',
                ownerActorId: previous.ownerActorId ?? actor.userId,
                acknowledgedByActorId: actor.userId,
                acknowledgedAt: now,
                acknowledgementNote: note,
              }
            : dto.action === 'RESOLVE'
              ? {
                  status: 'RESOLVED',
                  ownerActorId: previous.ownerActorId ?? actor.userId,
                  resolvedByActorId: actor.userId,
                  resolvedAt: now,
                  resolutionNote: note,
                }
              : {
                  status: 'OPEN',
                  resolvedByActorId: null,
                  resolvedAt: null,
                  resolutionNote: null,
                };
      const updated = await transaction.reconciliationFinding.update({
        where: { id },
        data,
      });
      await this.audit.record(
        {
          action: `RECONCILIATION_FINDING_${dto.action}`,
          entityType: 'ReconciliationFinding',
          entityId: id,
          actor,
          previousValue: previous,
          newValue: updated,
          metadata: { note },
        },
        transaction,
      );
      return updated;
    });
  }

  private async detect(
    transaction: Prisma.TransactionClient,
    overdueHours: number,
    now: Date,
  ): Promise<FindingInput[]> {
    const cutoff = new Date(now.getTime() - overdueHours * 60 * 60 * 1000);
    const [
      missingCollections,
      overdueCollections,
      rtoCollections,
      collectionVariances,
      settlementVariances,
      collectionsForPayment,
      paidCodOrders,
      activeTerminalReservations,
      stocks,
      agedRefunds,
      paidPrepaidOrders,
      succeededPaymentAttempts,
    ] = await Promise.all([
      transaction.shipment.findMany({
        where: {
          status: 'DELIVERED',
          codCollection: null,
          order: { paymentMethod: 'COD' },
        },
        include: { order: true, provider: true },
      }),
      transaction.codCollection.findMany({
        where: { status: 'EXPECTED', expectedAt: { lt: cutoff } },
        include: { order: true, shipment: { include: { provider: true } } },
      }),
      transaction.shipment.findMany({
        where: {
          status: { in: ['RTO', 'RETURNED'] },
          codCollection: { collectedAmount: { gt: 0 } },
        },
        include: { order: true, codCollection: true, provider: true },
      }),
      transaction.codCollection.findMany({
        where: { status: 'VARIANCE' },
        include: { order: true, shipment: true },
      }),
      transaction.courierSettlement.findMany({
        where: { status: 'VARIANCE' },
        include: { provider: true },
      }),
      transaction.codCollection.findMany({
        where: { status: { in: ['SETTLED', 'VARIANCE'] } },
        include: { order: true },
      }),
      transaction.order.findMany({
        where: {
          paymentMethod: 'COD',
          paymentStatus: 'PAID',
          OR: [
            { codCollection: null },
            { codCollection: { status: 'EXPECTED' } },
          ],
        },
        include: { codCollection: true },
      }),
      transaction.inventoryReservation.findMany({
        where: {
          status: 'ACTIVE',
          orderItem: { order: { status: { in: ['DELIVERED', 'CANCELLED'] } } },
        },
        include: { orderItem: { include: { order: true } } },
      }),
      transaction.inventoryStock.findMany({
        select: {
          id: true,
          onHand: true,
          reserved: true,
          damaged: true,
          incoming: true,
          variantId: true,
          warehouseId: true,
        },
      }),
      transaction.commerceRefund.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING', 'REQUIRES_ACTION'] },
          createdAt: { lt: cutoff },
        },
        include: {
          order: { select: { reference: true } },
          returnCase: { select: { rmaReference: true } },
        },
      }),
      transaction.order.findMany({
        where: {
          paymentMethod: 'PREPAID',
          paymentStatus: 'PAID',
        },
        include: {
          paymentAttempts: {
            where: { status: 'SUCCEEDED' },
          },
        },
      }),
      transaction.commercePaymentAttempt.findMany({
        where: { status: 'SUCCEEDED' },
        include: {
          order: {
            select: {
              id: true,
              reference: true,
              paymentStatus: true,
              total: true,
            },
          },
        },
      }),
    ]);
    const findings: FindingInput[] = [];
    for (const order of paidPrepaidOrders) {
      if (order.paymentAttempts.length === 0) {
        findings.push(
          this.finding(
            'PREPAID_UNVERIFIED_PAID_ORDER',
            'PAYMENT',
            'CRITICAL',
            'Paid prepaid order has no verified payment attempt',
            `Prepaid order ${order.reference} is marked PAID but has no SUCCEEDED payment attempt.`,
            'Order',
            order.id,
            {
              orderId: order.id,
              reference: order.reference,
              total: order.total,
            },
          ),
        );
      }
    }
    for (const attempt of succeededPaymentAttempts) {
      if (attempt.order.paymentStatus !== 'PAID') {
        findings.push(
          this.finding(
            'PREPAID_PAYMENT_STATE_MISMATCH',
            'PAYMENT',
            'CRITICAL',
            'Succeeded payment attempt but order not marked PAID',
            `Payment attempt ${attempt.merchantTransactionId} succeeded but order ${attempt.order.reference} is ${attempt.order.paymentStatus}.`,
            'CommercePaymentAttempt',
            attempt.id,
            {
              attemptId: attempt.id,
              orderId: attempt.orderId,
              orderReference: attempt.order.reference,
              paymentStatus: attempt.order.paymentStatus,
              providerTransactionId: attempt.providerTransactionId,
            },
          ),
        );
      }
      if (attempt.amount !== attempt.order.total) {
        findings.push(
          this.finding(
            'PREPAID_AMOUNT_MISMATCH',
            'PAYMENT',
            'CRITICAL',
            'Prepaid payment amount mismatch',
            `Payment attempt amount (${attempt.amount}) does not match order total (${attempt.order.total}) for ${attempt.order.reference}.`,
            'CommercePaymentAttempt',
            attempt.id,
            {
              attemptId: attempt.id,
              orderId: attempt.orderId,
              orderReference: attempt.order.reference,
              attemptAmount: attempt.amount,
              orderTotal: attempt.order.total,
            },
          ),
        );
      }
    }
    for (const shipment of missingCollections)
      findings.push(
        this.finding(
          'DELIVERED_COD_MISSING_COLLECTION',
          'SHIPPING',
          'CRITICAL',
          'Delivered COD has no collection expectation',
          `Delivered shipment ${shipment.trackingNumber ?? shipment.id} has no COD collection record.`,
          'Shipment',
          shipment.id,
          {
            orderId: shipment.orderId,
            orderReference: shipment.order.reference,
            provider: shipment.provider.code,
            codAmount: shipment.codAmount,
          },
        ),
      );
    for (const collection of overdueCollections)
      findings.push(
        this.finding(
          'OVERDUE_COD_COLLECTION',
          'SETTLEMENT',
          'HIGH',
          'COD collection is overdue',
          `Expected COD for ${collection.order.reference} remains unsettled beyond ${overdueHours} hours.`,
          'CodCollection',
          collection.id,
          {
            orderId: collection.orderId,
            shipmentId: collection.shipmentId,
            provider: collection.shipment.provider.code,
            expectedAmount: collection.expectedAmount,
            expectedAt: collection.expectedAt,
          },
        ),
      );
    for (const shipment of rtoCollections)
      findings.push(
        this.finding(
          'RTO_WITH_COLLECTION',
          'PAYMENT',
          'CRITICAL',
          'RTO shipment has recorded collection',
          `RTO shipment for ${shipment.order.reference} has a positive COD collection.`,
          'Shipment',
          shipment.id,
          {
            orderId: shipment.orderId,
            collectionId: shipment.codCollection?.id,
            collectedAmount: shipment.codCollection?.collectedAmount,
            provider: shipment.provider.code,
          },
        ),
      );
    for (const collection of collectionVariances)
      findings.push(
        this.finding(
          'COD_COLLECTION_VARIANCE',
          'SETTLEMENT',
          'HIGH',
          'COD collection amount variance',
          `Collected COD differs from expected for ${collection.order.reference}.`,
          'CodCollection',
          collection.id,
          {
            orderId: collection.orderId,
            shipmentId: collection.shipmentId,
            expectedAmount: collection.expectedAmount,
            collectedAmount: collection.collectedAmount,
            variance: collection.collectionVariance,
          },
        ),
      );
    for (const settlement of settlementVariances)
      findings.push(
        this.finding(
          'COURIER_SETTLEMENT_VARIANCE',
          'SETTLEMENT',
          'HIGH',
          'Courier bank remittance variance',
          `Settlement ${settlement.reference} does not match expected remittance.`,
          'CourierSettlement',
          settlement.id,
          {
            provider: settlement.provider.code,
            expectedRemittance: settlement.expectedRemittance,
            remittedAmount: settlement.remittedAmount,
            variance: settlement.variance,
            bankReference: settlement.bankReference,
          },
        ),
      );
    for (const collection of collectionsForPayment.filter(
      (entry) =>
        (entry.collectedAmount ?? 0) >= entry.expectedAmount &&
        entry.order.paymentStatus !== 'PAID',
    ))
      findings.push(
        this.finding(
          'COD_PAYMENT_STATE_MISMATCH',
          'PAYMENT',
          'HIGH',
          'Collected COD order is not marked paid',
          `${collection.order.reference} has full COD collection evidence but payment remains ${collection.order.paymentStatus}.`,
          'Order',
          collection.orderId,
          {
            collectionId: collection.id,
            expectedAmount: collection.expectedAmount,
            collectedAmount: collection.collectedAmount,
            paymentStatus: collection.order.paymentStatus,
          },
        ),
      );
    for (const order of paidCodOrders)
      findings.push(
        this.finding(
          'COD_PAYMENT_STATE_MISMATCH',
          'PAYMENT',
          'CRITICAL',
          'Paid COD order lacks settlement evidence',
          `${order.reference} is marked paid without a settled COD collection.`,
          'Order',
          order.id,
          {
            collectionId: order.codCollection?.id ?? null,
            collectionStatus: order.codCollection?.status ?? null,
          },
        ),
      );
    for (const reservation of activeTerminalReservations)
      findings.push(
        this.finding(
          'TERMINAL_ORDER_ACTIVE_RESERVATION',
          'INVENTORY',
          'CRITICAL',
          'Terminal order retains active inventory reservation',
          `${reservation.orderItem.order.reference} is ${reservation.orderItem.order.status} but reservation remains active.`,
          'InventoryReservation',
          reservation.id,
          {
            orderId: reservation.orderItem.orderId,
            orderItemId: reservation.orderItemId,
            inventoryId: reservation.inventoryId,
            quantity: reservation.quantity,
          },
        ),
      );
    for (const stock of stocks.filter(
      (entry) =>
        entry.onHand < 0 ||
        entry.reserved < 0 ||
        entry.damaged < 0 ||
        entry.incoming < 0 ||
        entry.reserved + entry.damaged > entry.onHand,
    ))
      findings.push(
        this.finding(
          'INVALID_STOCK_BALANCE',
          'INVENTORY',
          'CRITICAL',
          'Inventory balance is internally inconsistent',
          `Inventory ${stock.id} has impossible on-hand, reserved, damaged, or incoming quantities.`,
          'InventoryStock',
          stock.id,
          stock,
        ),
      );
    for (const refund of agedRefunds)
      findings.push(
        this.finding(
          'AGED_PENDING_REFUND',
          'REFUND',
          'HIGH',
          'Refund remains pending beyond threshold',
          `Refund ${refund.reference} for ${refund.order.reference} is still ${refund.status}.`,
          'CommerceRefund',
          refund.id,
          {
            orderId: refund.orderId,
            returnCaseId: refund.returnCaseId,
            rmaReference: refund.returnCase.rmaReference,
            amount: refund.amount,
            status: refund.status,
            createdAt: refund.createdAt,
          },
        ),
      );
    return findings;
  }

  private finding(
    type: ReconciliationFindingType,
    domain: FindingInput['domain'],
    severity: FindingInput['severity'],
    title: string,
    description: string,
    entityType: string,
    entityId: string,
    context: Prisma.InputJsonValue,
  ): FindingInput {
    return {
      type,
      domain,
      severity,
      title,
      description,
      entityType,
      entityId,
      context,
    };
  }

  private fingerprint(finding: FindingInput) {
    return createHash('sha256')
      .update(`${finding.type}:${finding.entityType}:${finding.entityId}`)
      .digest('hex');
  }

  private idempotencyHash(value?: string) {
    const key = value?.normalize('NFKC').trim();
    if (!key || key.length < 16 || key.length > 200)
      throw new BadRequestException('A valid idempotency key is required');
    return createHash('sha256').update(key).digest('hex');
  }

  private runReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `REC-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
