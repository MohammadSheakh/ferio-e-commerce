import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { assertTenantCommerceWritable } from '../../tenancy/commerce-write-guard.util';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { UserPayload } from '@app/common';
import { AuditService } from '../audit/services/audit.service';
import { CustomerNotificationsService } from '../customer-notifications/customer-notifications.service';
import {
  CreateWalletTopUpDto,
  ReviewWalletTopUpDto,
  WalletTopUpQueryDto,
} from './dto/wallet.dto';

type DatabaseClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: CustomerNotificationsService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one it explicitly falls back to the legacy DB.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  private idempotencyHash(raw?: string) {
    const value = raw?.trim();
    if (!value || value.length < 16 || value.length > 200) {
      throw new BadRequestException('A valid idempotency key is required');
    }
    return createHash('sha256').update(value).digest('hex');
  }

  private async ensureWallet(client: DatabaseClient, userId: string) {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isDeleted: true, walletId: true },
    });
    if (!user || user.isDeleted || user.role !== 'user') {
      throw new NotFoundException('Customer account not found');
    }
    if (user.walletId) {
      const wallet = await client.wallet.findUnique({
        where: { id: user.walletId },
      });
      if (wallet && !wallet.isDeleted) return wallet;
    }
    const wallet = await client.wallet.create({
      data: {
        amount: 0,
        totalBalance: 0,
        currency: 'bdt',
        status: 'active',
        isDeleted: false,
      },
    });
    await client.user.update({
      where: { id: userId },
      data: { walletId: wallet.id },
    });
    return wallet;
  }

  async summary(userId: string, page = 1, limit = 20) {
    const db = await this.db();
    const wallet = await db.$transaction((transaction) =>
      this.ensureWallet(transaction, userId),
    );
    const boundedPage = Math.max(1, page);
    const boundedLimit = Math.min(50, Math.max(1, limit));
    const [transactions, total, topUps] = await Promise.all([
      db.walletTransactionHistory.findMany({
        where: { walletId: wallet.id, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip: (boundedPage - 1) * boundedLimit,
        take: boundedLimit,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          status: true,
          referenceFor: true,
          orderId: true,
          topUpId: true,
          createdAt: true,
        },
      }),
      db.walletTransactionHistory.count({
        where: { walletId: wallet.id, isDeleted: false },
      }),
      db.walletTopUp.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          provider: true,
          amount: true,
          status: true,
          customerReference: true,
          customerNote: true,
          reviewNote: true,
          createdAt: true,
          reviewedAt: true,
          completedAt: true,
        },
      }),
    ]);
    return {
      wallet: {
        id: wallet.id,
        balance: wallet.amount,
        totalCredited: wallet.totalBalance,
        currency: 'BDT',
        status: wallet.status,
      },
      transactions,
      topUps,
      page: boundedPage,
      limit: boundedLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / boundedLimit)),
    };
  }

  async requestTopUp(
    userId: string,
    dto: CreateWalletTopUpDto,
    rawIdempotencyKey?: string,
  ) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const idempotencyKey = this.idempotencyHash(rawIdempotencyKey);
    return db.$transaction(
      async (transaction) => {
        const existing = await transaction.walletTopUp.findUnique({
          where: { idempotencyKey },
        });
        if (existing) return existing;
        const customerReference = dto.customerReference
          .normalize('NFKC')
          .trim()
          .toUpperCase();
        if (customerReference.length < 4) {
          throw new BadRequestException('A valid transaction reference is required');
        }
        const duplicate = await transaction.walletTopUp.findFirst({
          where: {
            userId,
            provider: dto.provider,
            customerReference,
            status: { in: ['PENDING_REVIEW', 'COMPLETED'] },
          },
        });
        if (duplicate) {
          throw new ConflictException('This top-up reference was already submitted');
        }
        const wallet = await this.ensureWallet(transaction, userId);
        return transaction.walletTopUp.create({
          data: {
            userId,
            walletId: wallet.id,
            provider: dto.provider,
            amount: dto.amount,
            customerReference,
            customerNote: dto.customerNote?.normalize('NFKC').trim() || null,
            idempotencyKey,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listTopUps(query: WalletTopUpQueryDto) {
    const db = await this.db();
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.WalletTopUpWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { customerReference: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.walletTopUp.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      db.walletTopUp.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async reviewTopUp(id: string, dto: ReviewWalletTopUpDto, actor: UserPayload) {
    const db = await this.db();
    const updated = await db.$transaction(
      async (transaction) => {
        const topUp = await transaction.walletTopUp.findUnique({
          where: { id },
          include: { wallet: true },
        });
        if (!topUp) throw new NotFoundException('Wallet top-up not found');
        if (topUp.status === dto.status) return topUp;
        if (topUp.status !== 'PENDING_REVIEW') {
          throw new ConflictException(`Top-up is already ${topUp.status.toLowerCase()}`);
        }
        if (dto.status === 'COMPLETED') {
          // Prisma returns the post-update row: derive an exact audit trail
          // instead of trusting the pre-read balance under concurrency.
          const updatedWallet = await transaction.wallet.update({
            where: { id: topUp.walletId },
            data: {
              amount: { increment: topUp.amount },
              totalBalance: { increment: topUp.amount },
            },
          });
          await transaction.walletTransactionHistory.create({
            data: {
              userId: topUp.userId,
              walletId: topUp.walletId,
              topUpId: topUp.id,
              idempotencyKey: `topup:${topUp.id}:credit`,
              type: 'credit',
              amount: topUp.amount,
              currency: 'bdt',
              balanceBefore: updatedWallet.amount - topUp.amount,
              balanceAfter: updatedWallet.amount,
              description: `${topUp.provider} wallet top-up approved`,
              status: 'completed',
              referenceFor: 'WalletTopUp',
              isDeleted: false,
            },
          });
        }
        const result = await transaction.walletTopUp.update({
          where: { id },
          data: {
            status: dto.status,
            reviewNote: dto.reviewNote.normalize('NFKC').trim(),
            reviewedById: actor.userId,
            reviewedAt: new Date(),
            completedAt: dto.status === 'COMPLETED' ? new Date() : null,
          },
        });
        await this.audit.record(
          {
            action: `WALLET_TOP_UP_${dto.status}`,
            entityType: 'WalletTopUp',
            entityId: topUp.id,
            actor,
            previousValue: { status: topUp.status },
            newValue: { status: dto.status, amount: topUp.amount },
            metadata: { provider: topUp.provider },
          },
          transaction,
        );
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifications.create({
      userId: updated.userId,
      deduplicationKey: `wallet-top-up:${updated.id}:${updated.status}`,
      type: 'wallet',
      title:
        updated.status === 'COMPLETED'
          ? 'Wallet top-up completed'
          : 'Wallet top-up rejected',
      message:
        updated.status === 'COMPLETED'
          ? `৳${(updated.amount / 100).toFixed(2)} was added to your Ferio wallet.`
          : updated.reviewNote || 'Review the top-up details and try again.',
      entityType: 'WalletTopUp',
      entityId: updated.id,
      linkFor: '/account/wallet',
    });
    return updated;
  }

  async debitOrder(
    transaction: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    amount: number,
  ) {
    const duplicate = await transaction.walletTransactionHistory.findUnique({
      where: { idempotencyKey: `order:${orderId}:debit` },
    });
    if (duplicate) return duplicate;
    const wallet = await this.ensureWallet(transaction, userId);
    if (wallet.status !== 'active') {
      throw new ConflictException('Wallet is not available');
    }
    const changed = await transaction.wallet.updateMany({
      where: { id: wallet.id, amount: { gte: amount }, status: 'active' },
      data: { amount: { decrement: amount } },
    });
    if (!changed.count) throw new ConflictException('Insufficient wallet balance');
    // Re-read inside this transaction for the authoritative post-debit value.
    const walletAfterDebit = await transaction.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
      select: { amount: true },
    });
    return transaction.walletTransactionHistory.create({
      data: {
        userId,
        walletId: wallet.id,
        orderId,
        idempotencyKey: `order:${orderId}:debit`,
        type: 'debit',
        amount,
        currency: 'bdt',
        balanceBefore: walletAfterDebit.amount + amount,
        balanceAfter: walletAfterDebit.amount,
        description: 'Ferio order paid from wallet',
        status: 'completed',
        referenceFor: 'OrderPurchase',
        isDeleted: false,
      },
    });
  }

  async refundCancelledOrder(
    transaction: Prisma.TransactionClient,
    customerId: string,
    orderId: string,
    amount: number,
  ) {
    const existing = await transaction.walletTransactionHistory.findUnique({
      where: { idempotencyKey: `order:${orderId}:refund` },
    });
    if (existing) return existing;
    // Fail closed against over-crediting: a refund can never exceed the
    // wallet debit recorded for this order.
    const originalDebit = await transaction.walletTransactionHistory.findUnique({
      where: { idempotencyKey: `order:${orderId}:debit` },
    });
    if (
      !originalDebit ||
      originalDebit.type !== 'debit' ||
      amount > originalDebit.amount
    ) {
      throw new ConflictException(
        'Refund amount exceeds the wallet-paid total for this order',
      );
    }
    const user = await transaction.user.findUnique({
      where: { customerId },
      select: { id: true },
    });
    if (!user) throw new ConflictException('Wallet owner could not be resolved');
    const wallet = await this.ensureWallet(transaction, user.id);
    const updatedWallet = await transaction.wallet.update({
      where: { id: wallet.id },
      data: { amount: { increment: amount }, totalBalance: { increment: amount } },
    });
    return transaction.walletTransactionHistory.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        orderId,
        idempotencyKey: `order:${orderId}:refund`,
        type: 'credit',
        amount,
        currency: 'bdt',
        balanceBefore: updatedWallet.amount - amount,
        balanceAfter: updatedWallet.amount,
        description: 'Cancelled order refunded to Ferio wallet',
        status: 'completed',
        referenceFor: 'OrderRefund',
        isDeleted: false,
      },
    });
  }
}
