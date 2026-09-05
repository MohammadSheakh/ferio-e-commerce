import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { AuditService } from '../../audit/audit.service';
import { CreateRefundDto, RecordRefundResultDto } from '../dto/refund.dto';

const refundInclude = {
  attempts: { orderBy: { attemptNumber: 'asc' as const } },
  returnCase: {
    select: { id: true, rmaReference: true, finalResolution: true },
  },
  order: {
    select: {
      id: true,
      reference: true,
      total: true,
      currency: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  },
} satisfies Prisma.CommerceRefundInclude;

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one it explicitly falls back to the legacy DB.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  async eligibility(returnCaseId: string) {
    const db = await this.db();
    const returnCase = await db.returnCase.findUnique({
      where: { id: returnCaseId },
      include: {
        order: { select: { id: true, currency: true, paymentMethod: true } },
        items: {
          include: {
            orderItem: {
              select: { lineTotal: true, quantity: true },
            },
          },
        },
        refunds: { where: { status: { not: 'CANCELLED' } } },
      },
    });
    if (!returnCase) throw new NotFoundException('Return case not found');
    const maximumRefundable = returnCase.items.reduce(
      (total, item) =>
        total +
        Math.floor(
          (item.orderItem.lineTotal * (item.acceptedQuantity ?? 0)) /
            item.orderItem.quantity,
        ),
      0,
    );
    const reservedAmount = returnCase.refunds.reduce(
      (total, refund) => total + refund.amount,
      0,
    );
    return {
      returnCaseId,
      orderId: returnCase.order.id,
      currency: returnCase.order.currency,
      paymentMethod: returnCase.order.paymentMethod,
      inspected: returnCase.status === 'INSPECTED',
      finalResolution: returnCase.finalResolution,
      maximumRefundable,
      reservedAmount,
      remainingAmount: Math.max(0, maximumRefundable - reservedAmount),
    };
  }

  async getReturnRefunds(returnCaseId: string) {
    const db = await this.db();
    return db.commerceRefund.findMany({
      where: { returnCaseId },
      include: refundInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    returnCaseId: string,
    rawIdempotencyKey: string | undefined,
    dto: CreateRefundDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const idempotencyKeyHash = this.idempotencyHash(rawIdempotencyKey);
    const duplicate = await db.commerceRefund.findUnique({
      where: { idempotencyKeyHash },
      include: refundInclude,
    });
    if (duplicate) return duplicate;

    return db.$transaction(
      async (transaction) => {
        const concurrentDuplicate = await transaction.commerceRefund.findUnique(
          {
            where: { idempotencyKeyHash },
            include: refundInclude,
          },
        );
        if (concurrentDuplicate) return concurrentDuplicate;
        const eligibility = await this.refundEligibilityInTransaction(
          returnCaseId,
          transaction,
        );
        if (
          !eligibility.inspected ||
          eligibility.finalResolution !== 'REFUND'
        ) {
          throw new ConflictException(
            'Refund requires an inspected return with refund resolution',
          );
        }
        if (dto.amount > eligibility.remainingAmount) {
          throw new ConflictException(
            `Refund exceeds the remaining refundable amount of ${eligibility.remainingAmount}`,
          );
        }
        if (
          dto.method === 'ORIGINAL_PAYMENT' &&
          (eligibility.paymentMethod === 'COD' || !dto.sourcePaymentReference)
        ) {
          throw new BadRequestException(
            'Original-payment refunds require a prepaid payment reference',
          );
        }
        const created = await transaction.commerceRefund.create({
          data: {
            reference: this.refundReference(),
            idempotencyKeyHash,
            orderId: eligibility.orderId,
            returnCaseId,
            amount: dto.amount,
            currency: eligibility.currency,
            method: dto.method,
            reason: this.clean(dto.reason),
            sourcePaymentReference: dto.sourcePaymentReference
              ? this.clean(dto.sourcePaymentReference)
              : null,
            createdByActorId: actor.userId,
          },
          include: refundInclude,
        });
        await transaction.order.update({
          where: { id: eligibility.orderId },
          data: { refundStatus: 'PENDING' },
        });
        await this.audit.record(
          {
            action: 'REFUND_CREATED',
            entityType: 'CommerceRefund',
            entityId: created.id,
            actor,
            newValue: created,
            metadata: { returnCaseId, orderId: eligibility.orderId },
          },
          transaction,
        );
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async recordResult(
    id: string,
    rawIdempotencyKey: string | undefined,
    dto: RecordRefundResultDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const deduplicationHash = this.idempotencyHash(rawIdempotencyKey);
    return db.$transaction(async (transaction) => {
      const duplicate = await transaction.refundAttempt.findUnique({
        where: { deduplicationHash },
        include: { refund: { include: refundInclude } },
      });
      if (duplicate) return duplicate.refund;
      const refund = await transaction.commerceRefund.findUnique({
        where: { id },
        include: { attempts: true },
      });
      if (!refund) throw new NotFoundException('Refund not found');
      if (['SUCCEEDED', 'CANCELLED'].includes(refund.status)) {
        throw new ConflictException('Refund is already terminal');
      }
      if (dto.outcome === 'SUCCEEDED' && !dto.externalReference?.trim()) {
        throw new BadRequestException(
          'Successful refund requires an external or receipt reference',
        );
      }
      if (dto.executionMode === 'PROVIDER' && !dto.provider?.trim()) {
        throw new BadRequestException(
          'Provider result requires a provider name',
        );
      }
      if (dto.outcome === 'FAILED' && !dto.failureReason?.trim()) {
        throw new BadRequestException('Failed refund requires a reason');
      }
      await transaction.refundAttempt.create({
        data: {
          refundId: id,
          attemptNumber: refund.attempts.length + 1,
          deduplicationHash,
          executionMode: dto.executionMode,
          outcome: dto.outcome,
          provider: dto.provider ? this.clean(dto.provider) : null,
          externalReference: dto.externalReference
            ? this.clean(dto.externalReference)
            : null,
          result: dto.result as Prisma.InputJsonValue | undefined,
          failureReason: dto.failureReason
            ? this.clean(dto.failureReason)
            : null,
          actorId: actor.userId,
        },
      });
      const now = new Date();
      await transaction.commerceRefund.update({
        where: { id },
        data: {
          status: dto.outcome,
          provider: dto.provider ? this.clean(dto.provider) : refund.provider,
          providerRefundId: dto.externalReference
            ? this.clean(dto.externalReference)
            : refund.providerRefundId,
          providerResult: dto.result as Prisma.InputJsonValue | undefined,
          failureReason:
            dto.outcome === 'FAILED' ? this.clean(dto.failureReason!) : null,
          processedAt: now,
          completedAt: dto.outcome === 'SUCCEEDED' ? now : null,
          completedByActorId: dto.outcome === 'SUCCEEDED' ? actor.userId : null,
        },
      });
      await this.syncOrderRefundStatus(refund.orderId, transaction);
      const updated = await transaction.commerceRefund.findUniqueOrThrow({
        where: { id },
        include: refundInclude,
      });
      await this.audit.record(
        {
          action: 'REFUND_RESULT_RECORDED',
          entityType: 'CommerceRefund',
          entityId: id,
          actor,
          previousValue: refund,
          newValue: updated,
          metadata: {
            outcome: dto.outcome,
            executionMode: dto.executionMode,
            attemptNumber: refund.attempts.length + 1,
          },
        },
        transaction,
      );
      return updated;
    });
  }

  private async refundEligibilityInTransaction(
    returnCaseId: string,
    transaction: Prisma.TransactionClient,
  ) {
    const returnCase = await transaction.returnCase.findUnique({
      where: { id: returnCaseId },
      include: {
        order: { select: { id: true, currency: true, paymentMethod: true } },
        items: {
          include: {
            orderItem: { select: { lineTotal: true, quantity: true } },
          },
        },
        refunds: { where: { status: { not: 'CANCELLED' } } },
      },
    });
    if (!returnCase) throw new NotFoundException('Return case not found');
    const maximumRefundable = returnCase.items.reduce(
      (total, item) =>
        total +
        Math.floor(
          (item.orderItem.lineTotal * (item.acceptedQuantity ?? 0)) /
            item.orderItem.quantity,
        ),
      0,
    );
    const reservedAmount = returnCase.refunds.reduce(
      (total, refund) => total + refund.amount,
      0,
    );
    return {
      orderId: returnCase.order.id,
      currency: returnCase.order.currency,
      paymentMethod: returnCase.order.paymentMethod,
      inspected: returnCase.status === 'INSPECTED',
      finalResolution: returnCase.finalResolution,
      remainingAmount: Math.max(0, maximumRefundable - reservedAmount),
    };
  }

  private async syncOrderRefundStatus(
    orderId: string,
    transaction: Prisma.TransactionClient,
  ) {
    const [order, refunds] = await Promise.all([
      transaction.order.findUniqueOrThrow({ where: { id: orderId } }),
      transaction.commerceRefund.findMany({
        where: { orderId, status: { not: 'CANCELLED' } },
      }),
    ]);
    const succeededAmount = refunds
      .filter((refund) => refund.status === 'SUCCEEDED')
      .reduce((total, refund) => total + refund.amount, 0);
    const pending = refunds.some((refund) =>
      ['PENDING', 'PROCESSING', 'REQUIRES_ACTION'].includes(refund.status),
    );
    const refundStatus = pending
      ? 'PENDING'
      : succeededAmount >= order.total
        ? 'REFUNDED'
        : succeededAmount > 0
          ? 'PARTIAL'
          : refunds.some((refund) => refund.status === 'FAILED')
            ? 'FAILED'
            : 'NONE';
    const paymentStatus =
      ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(
        order.paymentStatus,
      ) && succeededAmount > 0
        ? succeededAmount >= order.total
          ? 'REFUNDED'
          : 'PARTIALLY_REFUNDED'
        : undefined;
    await transaction.order.update({
      where: { id: orderId },
      data: { refundStatus, paymentStatus },
    });
  }

  private idempotencyHash(value?: string) {
    const key = value?.normalize('NFKC').trim();
    if (!key || key.length < 16 || key.length > 200) {
      throw new BadRequestException('A valid idempotency key is required');
    }
    return createHash('sha256').update(key).digest('hex');
  }

  private refundReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `RF-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private clean(value: string) {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }
}
