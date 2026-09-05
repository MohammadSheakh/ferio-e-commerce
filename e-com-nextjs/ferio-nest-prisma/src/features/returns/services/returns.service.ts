import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { Prisma, ReturnCaseStatus } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateReturnCaseDto,
  InspectReturnCaseDto,
  ReturnCaseQueryDto,
  ReviewReturnCaseDto,
} from '../dto/return.dto';
import { evaluateReturnEligibility } from '../utils/return.util';

const returnCaseInclude = {
  order: {
    select: {
      id: true,
      reference: true,
      status: true,
      customer: { select: { name: true, phoneNormalized: true } },
    },
  },
  items: {
    include: {
      orderItem: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          sku: true,
          quantity: true,
        },
      },
    },
  },
  evidence: { orderBy: { createdAt: 'asc' as const } },
  history: { orderBy: { createdAt: 'asc' as const } },
  refunds: {
    include: { attempts: { orderBy: { attemptNumber: 'asc' as const } } },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ReturnCaseInclude;

type ReturnClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ReturnsService {
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
  async getEligibility(orderId: string) {
    const db = await this.db();
    return this.loadEligibility(orderId, db);
  }

  async getOrderCases(orderId: string) {
    const db = await this.db();
    return db.returnCase.findMany({
      where: { orderId },
      include: returnCaseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCases(query: ReturnCaseQueryDto) {
    const db = await this.db();
    const where: Prisma.ReturnCaseWhereInput = { status: query.status };
    const [items, total] = await Promise.all([
      db.returnCase.findMany({
        where,
        include: returnCaseInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.returnCase.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async create(orderId: string, dto: CreateReturnCaseDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(
      async (transaction) => {
        const eligibility = await this.loadEligibility(orderId, transaction);
        // Eligibility gates creation: INELIGIBLE requests are rejected here,
        // not merely recorded. REVIEW_REQUIRED still proceeds to staff review.
        if (eligibility.status === 'INELIGIBLE') {
          throw new BadRequestException(
            'This order is not eligible for a return request.',
          );
        }
        const requestedIds = new Set(dto.items.map((item) => item.orderItemId));
        if (requestedIds.size !== dto.items.length) {
          throw new BadRequestException('Each order item may appear only once');
        }
        for (const requested of dto.items) {
          const eligibleItem = eligibility.items.find(
            (item) => item.orderItemId === requested.orderItemId,
          );
          if (!eligibleItem) {
            throw new BadRequestException(
              'Return item does not belong to this order',
            );
          }
          if (requested.quantity > eligibleItem.remainingQuantity) {
            throw new ConflictException(
              `${eligibleItem.productName} has only ${eligibleItem.remainingQuantity} returnable units remaining`,
            );
          }
        }

        const created = await transaction.returnCase.create({
          data: {
            orderId,
            rmaReference: this.rmaReference(),
            eligibilityStatus: eligibility.status,
            eligibilityReasons: eligibility.reasons,
            reason: dto.reason,
            description: this.clean(dto.description),
            requestedResolution: dto.requestedResolution,
            requestChannel: dto.requestChannel,
            createdByActorId: actor.userId,
            items: {
              create: dto.items.map((item) => ({
                orderItemId: item.orderItemId,
                requestedQuantity: item.quantity,
              })),
            },
            evidence: {
              create: (dto.evidenceUrls ?? []).map((url) => ({ url })),
            },
            history: {
              create: {
                newStatus: 'REQUESTED',
                actorId: actor.userId,
                note: `Eligibility: ${eligibility.status}`,
              },
            },
          },
          include: returnCaseInclude,
        });
        await transaction.order.update({
          where: { id: orderId },
          data: { returnStatus: 'REQUESTED' },
        });
        await this.audit.record(
          {
            action: 'RETURN_CASE_CREATED',
            entityType: 'ReturnCase',
            entityId: created.id,
            actor,
            newValue: created,
            metadata: { orderId, eligibility: eligibility.status },
          },
          transaction,
        );
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async review(id: string, dto: ReviewReturnCaseDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(async (transaction) => {
      const existing = await transaction.returnCase.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) throw new NotFoundException('Return case not found');
      if (!['REQUESTED', 'UNDER_REVIEW'].includes(existing.status)) {
        throw new ConflictException('Return case has already been reviewed');
      }

      const approvedQuantities = this.reviewQuantities(existing.items, dto);
      await Promise.all(
        existing.items.map((item) =>
          transaction.returnItem.update({
            where: { id: item.id },
            data: { approvedQuantity: approvedQuantities.get(item.id) ?? 0 },
          }),
        ),
      );
      const status = this.reviewStatus(dto.decision);
      await transaction.returnCase.update({
        where: { id },
        data: {
          status,
          reviewDecision: dto.decision,
          reviewReason: this.clean(dto.reason),
          reviewedByActorId: actor.userId,
          reviewedAt: new Date(),
        },
      });
      await transaction.returnStatusHistory.create({
        data: {
          returnCaseId: id,
          oldStatus: existing.status,
          newStatus: status,
          actorId: actor.userId,
          note: this.clean(dto.reason),
        },
      });
      await this.syncOrderReturnStatus(existing.orderId, transaction);
      const updated = await transaction.returnCase.findUniqueOrThrow({
        where: { id },
        include: returnCaseInclude,
      });
      await this.audit.record(
        {
          action: 'RETURN_CASE_REVIEWED',
          entityType: 'ReturnCase',
          entityId: id,
          actor,
          previousValue: existing,
          newValue: updated,
          metadata: { decision: dto.decision },
        },
        transaction,
      );
      return updated;
    });
  }

  async inspect(id: string, dto: InspectReturnCaseDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(
      async (transaction) => {
        const existing = await transaction.returnCase.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                orderItem: {
                  include: {
                    reservations: {
                      where: { status: 'CONSUMED' },
                      include: { inventory: true },
                      orderBy: { createdAt: 'asc' },
                    },
                  },
                },
              },
            },
          },
        });
        if (!existing) throw new NotFoundException('Return case not found');
        if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(existing.status)) {
          throw new ConflictException(
            'Only an approved return can be received and inspected',
          );
        }
        const inspectionItems = new Map(
          dto.items.map((item) => [item.returnItemId, item]),
        );
        if (
          inspectionItems.size !== existing.items.length ||
          existing.items.some((item) => !inspectionItems.has(item.id))
        ) {
          throw new BadRequestException(
            'Provide inspection details for every return item',
          );
        }

        let receivedTotal = 0;
        let acceptedTotal = 0;
        for (const item of existing.items) {
          const inspection = inspectionItems.get(item.id)!;
          const approvedQuantity = item.approvedQuantity ?? 0;
          if (inspection.receivedQuantity > approvedQuantity) {
            throw new BadRequestException(
              'Received quantity cannot exceed approved quantity',
            );
          }
          if (inspection.acceptedQuantity > inspection.receivedQuantity) {
            throw new BadRequestException(
              'Accepted quantity cannot exceed received quantity',
            );
          }
          receivedTotal += inspection.receivedQuantity;
          acceptedTotal += inspection.acceptedQuantity;
        }
        this.assertInspectionDecision(dto, receivedTotal, acceptedTotal);

        for (const item of existing.items) {
          const inspection = inspectionItems.get(item.id)!;
          await this.restoreInspectedInventory(
            transaction,
            existing.id,
            item.orderItem.reservations,
            inspection.receivedQuantity,
            inspection.inventoryDisposition,
            actor.userId,
          );
          await transaction.returnItem.update({
            where: { id: item.id },
            data: {
              receivedQuantity: inspection.receivedQuantity,
              acceptedQuantity: inspection.acceptedQuantity,
              condition: inspection.condition,
              inventoryDisposition: inspection.inventoryDisposition,
              inspectionNote: inspection.note
                ? this.clean(inspection.note)
                : null,
            },
          });
        }

        const inspectedAt = new Date();
        await transaction.returnCase.update({
          where: { id },
          data: {
            status: 'INSPECTED',
            inspectionDecision: dto.decision,
            finalResolution: dto.finalResolution,
            inspectionNote: this.clean(dto.note),
            inspectedByActorId: actor.userId,
            receivedAt: inspectedAt,
            inspectedAt,
          },
        });
        await transaction.returnStatusHistory.create({
          data: {
            returnCaseId: id,
            oldStatus: existing.status,
            newStatus: 'INSPECTED',
            actorId: actor.userId,
            note: this.clean(dto.note),
          },
        });
        await transaction.order.update({
          where: { id: existing.orderId },
          data: { returnStatus: 'RECEIVED' },
        });
        const updated = await transaction.returnCase.findUniqueOrThrow({
          where: { id },
          include: returnCaseInclude,
        });
        await this.audit.record(
          {
            action: 'RETURN_CASE_INSPECTED',
            entityType: 'ReturnCase',
            entityId: id,
            actor,
            previousValue: existing,
            newValue: updated,
            metadata: {
              decision: dto.decision,
              finalResolution: dto.finalResolution,
              receivedTotal,
              acceptedTotal,
            },
          },
          transaction,
        );
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async loadEligibility(orderId: string, client: ReturnClient) {
    const [order, settings] = await Promise.all([
      client.order.findUnique({
        where: { id: orderId },
        include: {
          shipment: { select: { deliveredAt: true } },
          items: {
            select: {
              id: true,
              productName: true,
              variantName: true,
              sku: true,
              quantity: true,
            },
          },
        },
      }),
      client.commerceSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
          id: 'default',
          storeName: 'Ferio',
          currency: 'BDT',
          timezone: 'Asia/Dhaka',
          orderPrefix: 'FER',
        },
      }),
    ]);
    if (!order) throw new NotFoundException('Order not found');
    const usedItems = await client.returnItem.findMany({
      where: {
        orderItemId: { in: order.items.map((item) => item.id) },
        returnCase: { status: { notIn: ['REJECTED', 'CANCELLED'] } },
      },
      select: { orderItemId: true, requestedQuantity: true },
    });
    const usedByItem = new Map<string, number>();
    for (const item of usedItems) {
      usedByItem.set(
        item.orderItemId,
        (usedByItem.get(item.orderItemId) ?? 0) + item.requestedQuantity,
      );
    }
    const evaluation = evaluateReturnEligibility({
      orderStatus: order.status,
      deliveredAt: order.shipment?.deliveredAt ?? null,
      returnWindowDays: settings.defaultReturnWindowDays,
    });
    return {
      orderId: order.id,
      status: evaluation.status,
      reasons: evaluation.reasons,
      windowEndsAt: evaluation.windowEndsAt,
      returnWindowDays: settings.defaultReturnWindowDays,
      deliveredAt: order.shipment?.deliveredAt ?? null,
      items: order.items.map((item) => ({
        orderItemId: item.id,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        orderedQuantity: item.quantity,
        remainingQuantity: Math.max(
          0,
          item.quantity - (usedByItem.get(item.id) ?? 0),
        ),
      })),
    };
  }

  private reviewQuantities(
    items: Array<{ id: string; requestedQuantity: number }>,
    dto: ReviewReturnCaseDto,
  ) {
    if (dto.decision === 'APPROVE') {
      return new Map(items.map((item) => [item.id, item.requestedQuantity]));
    }
    if (dto.decision === 'REJECT') {
      return new Map(items.map((item) => [item.id, 0]));
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'Partial approval requires approved quantities',
      );
    }
    const quantities = new Map(
      dto.items.map((item) => [item.returnItemId, item.approvedQuantity]),
    );
    if (quantities.size !== items.length) {
      throw new BadRequestException(
        'Provide an approved quantity for every return item',
      );
    }
    let approvedTotal = 0;
    let requestedTotal = 0;
    for (const item of items) {
      const quantity = quantities.get(item.id);
      if (quantity === undefined || quantity > item.requestedQuantity) {
        throw new BadRequestException('Approved quantity is invalid');
      }
      approvedTotal += quantity;
      requestedTotal += item.requestedQuantity;
    }
    if (approvedTotal <= 0 || approvedTotal >= requestedTotal) {
      throw new BadRequestException(
        'Partial approval must approve some but not all requested units',
      );
    }
    return quantities;
  }

  private reviewStatus(
    decision: ReviewReturnCaseDto['decision'],
  ): ReturnCaseStatus {
    if (decision === 'APPROVE') return 'APPROVED';
    if (decision === 'PARTIAL_APPROVE') return 'PARTIALLY_APPROVED';
    return 'REJECTED';
  }

  private assertInspectionDecision(
    dto: InspectReturnCaseDto,
    receivedTotal: number,
    acceptedTotal: number,
  ) {
    if (receivedTotal <= 0) {
      throw new BadRequestException(
        'Inspection requires at least one physically received unit',
      );
    }
    if (dto.decision === 'ACCEPT' && acceptedTotal !== receivedTotal) {
      throw new BadRequestException(
        'Accept decision requires every received unit to be accepted',
      );
    }
    if (
      dto.decision === 'PARTIAL_ACCEPT' &&
      (acceptedTotal <= 0 || acceptedTotal >= receivedTotal)
    ) {
      throw new BadRequestException(
        'Partial acceptance must accept some but not all received units',
      );
    }
    if (dto.decision === 'REJECT' && acceptedTotal !== 0) {
      throw new BadRequestException(
        'Rejected inspection cannot include accepted units',
      );
    }
    if ((dto.decision === 'REJECT') !== (dto.finalResolution === 'REJECTED')) {
      throw new BadRequestException(
        'Rejected inspections require a rejected final resolution',
      );
    }
  }

  private async restoreInspectedInventory(
    transaction: Prisma.TransactionClient,
    returnCaseId: string,
    reservations: Array<{
      inventoryId: string;
      quantity: number;
      inventory: { id: string };
    }>,
    receivedQuantity: number,
    disposition: InspectReturnCaseDto['items'][number]['inventoryDisposition'],
    actorId: string,
  ) {
    if (
      receivedQuantity === 0 ||
      disposition === 'QUARANTINED' ||
      disposition === 'LOST'
    ) {
      return;
    }
    let remaining = receivedQuantity;
    for (const reservation of reservations) {
      if (remaining === 0) break;
      const quantity = Math.min(remaining, reservation.quantity);
      await transaction.inventoryStock.update({
        where: { id: reservation.inventoryId },
        data: {
          onHand: { increment: quantity },
          damaged:
            disposition === 'DAMAGED' ? { increment: quantity } : undefined,
        },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryId: reservation.inventoryId,
          type: disposition === 'DAMAGED' ? 'DAMAGE' : 'RETURN',
          quantityDelta: quantity,
          reason:
            disposition === 'DAMAGED'
              ? 'Inspected customer return received as damaged'
              : 'Inspected customer return restored as sellable',
          referenceType: 'ReturnCase',
          referenceId: returnCaseId,
          actorId,
        },
      });
      remaining -= quantity;
    }
    if (remaining > 0) {
      throw new ConflictException(
        'Received quantity exceeds traceable delivered inventory',
      );
    }
  }

  private async syncOrderReturnStatus(
    orderId: string,
    transaction: Prisma.TransactionClient,
  ) {
    const cases = await transaction.returnCase.findMany({
      where: { orderId },
      select: { status: true },
    });
    const returnStatus = cases.some((item) =>
      ['APPROVED', 'PARTIALLY_APPROVED'].includes(item.status),
    )
      ? 'APPROVED'
      : cases.some((item) =>
            ['REQUESTED', 'UNDER_REVIEW'].includes(item.status),
          )
        ? 'REQUESTED'
        : 'REJECTED';
    await transaction.order.update({
      where: { id: orderId },
      data: { returnStatus },
    });
  }

  private rmaReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `RMA-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private clean(value: string) {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }
}
