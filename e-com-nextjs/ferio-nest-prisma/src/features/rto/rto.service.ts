import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { AuditService } from '../audit/services/audit.service';
import { InspectRtoCaseDto } from './dto/rto.dto';

const rtoInclude = {
  shipment: { include: { provider: true } },
  order: {
    select: {
      id: true,
      reference: true,
      status: true,
      currency: true,
      customer: { select: { name: true, phoneNormalized: true } },
    },
  },
  items: {
    include: {
      orderItem: {
        select: { productName: true, variantName: true, sku: true },
      },
      reservation: { select: { status: true, inventoryId: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RtoCaseInclude;

@Injectable()
export class RtoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one it explicitly falls back to the legacy DB.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }
  async list() {
    const db = await this.db();
    return db.rtoCase.findMany({
      take: 100,
      include: rtoInclude,
      orderBy: { courierReturnedAt: 'desc' },
    });
  }

  async inspect(id: string, dto: InspectRtoCaseDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(
      async (transaction) => {
        const rtoCase = await transaction.rtoCase.findUnique({
          where: { id },
          include: { items: { include: { reservation: true } }, order: true },
        });
        if (!rtoCase) throw new NotFoundException('RTO case not found');
        if (rtoCase.status !== 'AWAITING_RECEIPT') {
          throw new ConflictException('RTO case is already inspected');
        }
        const submitted = new Map(
          dto.items.map((item) => [item.rtoItemId, item]),
        );
        if (submitted.size !== rtoCase.items.length) {
          throw new BadRequestException(
            'Every RTO item must be inspected exactly once',
          );
        }
        for (const item of rtoCase.items) {
          const input = submitted.get(item.id);
          if (!input)
            throw new BadRequestException('Every RTO item is required');
          if (
            input.receivedQuantity + input.lostQuantity !==
            item.expectedQuantity
          ) {
            throw new BadRequestException(
              'Received and lost quantities must equal the expected quantity',
            );
          }
          if (
            input.sellableQuantity + input.damagedQuantity !==
            input.receivedQuantity
          ) {
            throw new BadRequestException(
              'Sellable and damaged quantities must equal the received quantity',
            );
          }
          if (item.reservation.status !== 'ACTIVE') {
            throw new ConflictException(
              'RTO inventory reservation is no longer active',
            );
          }
          const stock = await transaction.inventoryStock.findUnique({
            where: { id: item.reservation.inventoryId },
          });
          if (
            !stock ||
            stock.reserved < item.expectedQuantity ||
            stock.onHand < input.lostQuantity
          ) {
            throw new ConflictException('RTO inventory is inconsistent');
          }
        }
        const now = new Date();
        for (const item of rtoCase.items) {
          const input = submitted.get(item.id)!;
          await transaction.inventoryStock.update({
            where: { id: item.reservation.inventoryId },
            data: {
              reserved: { decrement: item.expectedQuantity },
              onHand: input.lostQuantity
                ? { decrement: input.lostQuantity }
                : undefined,
              damaged: input.damagedQuantity
                ? { increment: input.damagedQuantity }
                : undefined,
            },
          });
          await transaction.inventoryReservation.update({
            where: { id: item.reservationId },
            data: { status: 'RELEASED', releasedAt: now },
          });
          await transaction.inventoryMovement.create({
            data: {
              inventoryId: item.reservation.inventoryId,
              type: 'RELEASE',
              quantityDelta: -item.expectedQuantity,
              reason: 'RTO reservation settled after physical receipt',
              referenceType: 'RtoCase',
              referenceId: id,
              actorId: actor.userId,
            },
          });
          if (input.damagedQuantity > 0) {
            await transaction.inventoryMovement.create({
              data: {
                inventoryId: item.reservation.inventoryId,
                type: 'DAMAGE',
                quantityDelta: input.damagedQuantity,
                reason: 'Damaged units received from RTO parcel',
                referenceType: 'RtoCase',
                referenceId: id,
                actorId: actor.userId,
              },
            });
          }
          if (input.lostQuantity > 0) {
            await transaction.inventoryMovement.create({
              data: {
                inventoryId: item.reservation.inventoryId,
                type: 'CORRECTION',
                quantityDelta: -input.lostQuantity,
                reason: 'Units missing from RTO parcel',
                referenceType: 'RtoCase',
                referenceId: id,
                actorId: actor.userId,
              },
            });
          }
          await transaction.rtoItem.update({
            where: { id: item.id },
            data: {
              receivedQuantity: input.receivedQuantity,
              sellableQuantity: input.sellableQuantity,
              damagedQuantity: input.damagedQuantity,
              lostQuantity: input.lostQuantity,
              note: input.note?.normalize('NFKC').trim() || null,
            },
          });
        }
        const totalCost =
          dto.outboundCourierCost + dto.returnCourierCost + dto.otherCost;
        if (totalCost > 2_000_000_000) {
          throw new BadRequestException(
            'Combined RTO cost exceeds the supported amount',
          );
        }
        await transaction.rtoCase.update({
          where: { id },
          data: {
            status: 'INSPECTED',
            reason: dto.reason,
            reasonNote: dto.reasonNote.normalize('NFKC').trim(),
            outboundCourierCost: dto.outboundCourierCost,
            returnCourierCost: dto.returnCourierCost,
            otherCost: dto.otherCost,
            totalCost,
            inspectedAt: now,
            inspectedByActorId: actor.userId,
          },
        });
        if (rtoCase.order.status !== 'CANCELLED') {
          await transaction.order.update({
            where: { id: rtoCase.orderId },
            data: {
              status: 'CANCELLED',
              fulfillmentStatus: 'CANCELLED',
              shipmentStatus: 'RTO',
              cancellationReason: `RTO: ${dto.reasonNote.normalize('NFKC').trim()}`,
              cancelledAt: now,
            },
          });
          await transaction.orderStatusHistory.create({
            data: {
              orderId: rtoCase.orderId,
              oldStatus: rtoCase.order.status,
              newStatus: 'CANCELLED',
              source: 'SYSTEM',
              note: `RTO received: ${dto.reasonNote.normalize('NFKC').trim()}`,
            },
          });
          await transaction.fulfillmentHistory.create({
            data: {
              orderId: rtoCase.orderId,
              oldStatus: rtoCase.order.fulfillmentStatus,
              newStatus: 'CANCELLED',
              source: 'SYSTEM',
              note: 'RTO parcel physically received and inspected',
            },
          });
        }
        const updated = await transaction.rtoCase.findUniqueOrThrow({
          where: { id },
          include: rtoInclude,
        });
        await this.audit.record(
          {
            action: 'RTO_CASE_INSPECTED',
            entityType: 'RtoCase',
            entityId: id,
            actor,
            previousValue: rtoCase,
            newValue: updated,
            metadata: { totalCost },
          },
          transaction,
        );
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
