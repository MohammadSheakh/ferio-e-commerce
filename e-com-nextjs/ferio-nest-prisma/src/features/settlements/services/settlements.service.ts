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
import { AuditService } from '../../audit/services/audit.service';
import { CreateCourierSettlementDto } from '../dto/settlement.dto';

const settlementInclude = {
  provider: true,
  items: {
    include: {
      shipment: {
        include: {
          order: { select: { id: true, reference: true, paymentStatus: true } },
        },
      },
      codCollection: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CourierSettlementInclude;

@Injectable()
export class SettlementsService {
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
    return db.courierSettlement.findMany({
      take: 100,
      include: settlementInclude,
      orderBy: { settledAt: 'desc' },
    });
  }

  async eligibleCollections() {
    const db = await this.db();
    return db.codCollection.findMany({
      where: { status: 'EXPECTED', settlementItem: null },
      take: 500,
      include: {
        shipment: { include: { provider: true } },
        order: {
          select: {
            id: true,
            reference: true,
            paymentMethod: true,
            paymentStatus: true,
            customer: { select: { name: true, phoneNormalized: true } },
          },
        },
      },
      orderBy: { expectedAt: 'asc' },
    });
  }

  async create(
    rawIdempotencyKey: string | undefined,
    dto: CreateCourierSettlementDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const idempotencyKeyHash = this.idempotencyHash(rawIdempotencyKey);
    const providerReference = this.clean(dto.providerSettlementReference);
    const shipmentIds = dto.items.map((item) => item.shipmentId);
    if (new Set(shipmentIds).size !== shipmentIds.length) {
      throw new BadRequestException(
        'A shipment can appear only once in a settlement',
      );
    }
    const duplicate = await db.courierSettlement.findUnique({
      where: { idempotencyKeyHash },
      include: settlementInclude,
    });
    if (duplicate) return duplicate;
    try {
      return await db.$transaction(
        async (transaction) => {
          const concurrentDuplicate =
            await transaction.courierSettlement.findUnique({
              where: { idempotencyKeyHash },
              include: settlementInclude,
            });
          if (concurrentDuplicate) return concurrentDuplicate;
          const provider = await transaction.shipmentProvider.findUnique({
            where: { code: dto.provider },
          });
          if (!provider)
            throw new NotFoundException('Courier provider not found');
          const existingReference =
            await transaction.courierSettlement.findUnique({
              where: {
                providerId_providerSettlementReference: {
                  providerId: provider.id,
                  providerSettlementReference: providerReference,
                },
              },
            });
          if (existingReference)
            throw new ConflictException(
              'Provider settlement reference already exists',
            );
          const shipments = await transaction.shipment.findMany({
            where: { id: { in: shipmentIds } },
            include: {
              provider: true,
              order: true,
              codCollection: true,
              settlementItem: true,
            },
          });
          if (shipments.length !== shipmentIds.length)
            throw new NotFoundException('One or more shipments were not found');
          const shipmentMap = new Map(
            shipments.map((shipment) => [shipment.id, shipment]),
          );
          const calculatedItems = dto.items.map((input) => {
            const shipment = shipmentMap.get(input.shipmentId)!;
            if (shipment.provider.code !== dto.provider)
              throw new BadRequestException(
                'Every shipment must belong to the selected provider',
              );
            if (
              shipment.status !== 'DELIVERED' ||
              shipment.order.paymentMethod !== 'COD'
            ) {
              throw new ConflictException(
                'Only delivered COD shipments can be settled',
              );
            }
            if (!shipment.codCollection)
              throw new ConflictException(
                'Shipment has no expected COD collection record',
              );
            if (shipment.settlementItem)
              throw new ConflictException(
                'Shipment is already included in a settlement',
              );
            const expectedRemittance =
              input.collectedAmount - input.courierFee - input.otherDeduction;
            if (expectedRemittance < 0)
              throw new BadRequestException(
                'Fees and deductions cannot exceed collected amount',
              );
            const collectionVariance =
              input.collectedAmount - shipment.codCollection.expectedAmount;
            return { input, shipment, expectedRemittance, collectionVariance };
          });
          const grossCollected = this.safeSum(
            calculatedItems.map((item) => item.input.collectedAmount),
            'gross collected amount',
          );
          const courierFees = this.safeSum(
            calculatedItems.map((item) => item.input.courierFee),
            'courier fees',
          );
          const otherDeductions = this.safeSum(
            calculatedItems.map((item) => item.input.otherDeduction),
            'other deductions',
          );
          const expectedRemittance = this.safeSum(
            calculatedItems.map((item) => item.expectedRemittance),
            'expected remittance',
          );
          const variance = dto.remittedAmount - expectedRemittance;
          const hasVariance =
            variance !== 0 ||
            calculatedItems.some((item) => item.collectionVariance !== 0);
          const createdSettlement = await transaction.courierSettlement.create({
            data: {
              reference: this.settlementReference(),
              idempotencyKeyHash,
              providerSettlementReference: providerReference,
              bankReference: this.clean(dto.bankReference),
              status: hasVariance ? 'VARIANCE' : 'MATCHED',
              grossCollected,
              courierFees,
              otherDeductions,
              expectedRemittance,
              remittedAmount: dto.remittedAmount,
              variance,
              settledAt: new Date(dto.settledAt),
              recordedByActorId: actor.userId,
              note: dto.note ? this.clean(dto.note) : null,
              providerId: provider.id,
              items: {
                create: calculatedItems.map((item) => ({
                  shipmentId: item.shipment.id,
                  codCollectionId: item.shipment.codCollection!.id,
                  status:
                    item.collectionVariance === 0 ? 'MATCHED' : 'VARIANCE',
                  expectedCodAmount:
                    item.shipment.codCollection!.expectedAmount,
                  collectedAmount: item.input.collectedAmount,
                  courierFee: item.input.courierFee,
                  otherDeduction: item.input.otherDeduction,
                  expectedRemittance: item.expectedRemittance,
                  collectionVariance: item.collectionVariance,
                  note: item.input.note ? this.clean(item.input.note) : null,
                })),
              },
            },
          });
          for (const item of calculatedItems) {
            const collectedInFull =
              item.input.collectedAmount >=
              item.shipment.codCollection!.expectedAmount;
            await transaction.codCollection.update({
              where: { id: item.shipment.codCollection!.id },
              data: {
                status: item.collectionVariance === 0 ? 'SETTLED' : 'VARIANCE',
                collectedAmount: item.input.collectedAmount,
                collectionVariance: item.collectionVariance,
                settledAt: new Date(dto.settledAt),
              },
            });
            if (
              collectedInFull &&
              item.shipment.order.paymentStatus === 'UNPAID'
            ) {
              await transaction.order.update({
                where: { id: item.shipment.orderId },
                data: { paymentStatus: 'PAID' },
              });
            }
          }
          const settlement =
            await transaction.courierSettlement.findUniqueOrThrow({
              where: { id: createdSettlement.id },
              include: settlementInclude,
            });
          await this.audit.record(
            {
              action: 'COURIER_SETTLEMENT_RECORDED',
              entityType: 'CourierSettlement',
              entityId: settlement.id,
              actor,
              newValue: settlement,
              metadata: {
                provider: dto.provider,
                itemCount: calculatedItems.length,
                variance,
              },
            },
            transaction,
          );
          return settlement;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        const concurrentDuplicate =
          await db.courierSettlement.findUnique({
            where: { idempotencyKeyHash },
            include: settlementInclude,
          });
        if (concurrentDuplicate) return concurrentDuplicate;
        const existingReference = await db.courierSettlement.findFirst(
          {
            where: {
              provider: { code: dto.provider },
              providerSettlementReference: providerReference,
            },
            select: { id: true },
          },
        );
        if (existingReference) {
          throw new ConflictException(
            'Provider settlement reference already exists',
          );
        }
        const claimedShipment =
          await db.courierSettlementItem.findFirst({
            where: { shipmentId: { in: shipmentIds } },
            select: { shipmentId: true },
          });
        if (claimedShipment) {
          throw new ConflictException(
            'One or more shipments are already included in a settlement',
          );
        }
        throw new ConflictException(
          'Settlement changed concurrently; retry safely',
        );
      }
      throw error;
    }
  }

  private idempotencyHash(value?: string) {
    const key = value?.normalize('NFKC').trim();
    if (!key || key.length < 16 || key.length > 200)
      throw new BadRequestException('A valid idempotency key is required');
    return createHash('sha256').update(key).digest('hex');
  }

  private safeSum(values: number[], label: string) {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total > 2_000_000_000)
      throw new BadRequestException(
        `Combined ${label} exceeds the supported amount`,
      );
    return total;
  }

  private settlementReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `STL-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private clean(value: string) {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }
}
