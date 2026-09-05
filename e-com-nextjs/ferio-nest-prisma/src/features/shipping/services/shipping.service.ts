import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  OrderShipmentStatus,
  Prisma,
  ShipmentProviderCode,
} from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { toTenantJsonInput } from '../../../core/database/json-input.util';
import type { UserPayload } from '@app/common';
import type { CourierAdapter } from '../adapters/courier-adapter.interface';
import { PathaoAdapter } from '../adapters/pathao.adapter';
import { SteadfastAdapter } from '../adapters/steadfast.adapter';
import { RedxAdapter } from '../adapters/redx.adapter';
import { EcourierAdapter } from '../adapters/ecourier.adapter';
import { PaperflyAdapter } from '../adapters/paperfly.adapter';
import { CarrybeeAdapter } from '../adapters/carrybee.adapter';
import { CourierRouterService } from './courier-router.service';
import {
  CreateShipmentDto,
  UpdateShipmentProviderDto,
} from '../dto/shipping.dto';
import type { PollCourierShipmentInput } from '../adapters/courier-adapter.interface';
import { canApplyShipmentStatus } from '../utils/shipping.util';
import { TransactionalMessagingService } from '../../transactional-messaging/services/transactional-messaging.service';
import { AuditService } from '../../audit/services/audit.service';

const shipmentInclude = {
  provider: true,
  events: { orderBy: { occurredAt: 'asc' as const } },
} satisfies Prisma.ShipmentInclude;

const WEBHOOK_PROCESSING_LEASE_MS = 5 * 60 * 1000;

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pathao: PathaoAdapter,
    private readonly steadfast: SteadfastAdapter,
    private readonly redx: RedxAdapter,
    private readonly ecourier: EcourierAdapter,
    private readonly paperfly: PaperflyAdapter,
    private readonly carrybee: CarrybeeAdapter,
    public readonly courierRouter: CourierRouterService,
    private readonly messages: TransactionalMessagingService,
    private readonly audit: AuditService,

    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

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
  private adapter(code: ShipmentProviderCode): CourierAdapter {
    switch (code) {
      case 'PATHAO':
        return this.pathao;
      case 'STEADFAST':
        return this.steadfast;
      case 'REDX':
        return this.redx;
      case 'ECOURIER':
        return this.ecourier;
      case 'PAPERFLY':
        return this.paperfly;
      case 'CARRYBEE':
        return this.carrybee;
      default:
        return this.pathao;
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private rtoReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `RTO-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private localPhone(normalized: string): string {
    return normalized.startsWith('+88') ? normalized.slice(3) : normalized;
  }

  private sanitizedHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      result[key] = [
        'authorization',
        'x-pathao-signature',
        'x-pathao-merchant-webhook-integration-secret',
      ].includes(key.toLowerCase())
        ? '[REDACTED]'
        : value;
    }
    return result;
  }

  async getProviders() {
    const db = await this.db();
    const providers = await db.shipmentProvider.findMany({
      orderBy: { name: 'asc' },
    });
    return providers.map((provider) => ({
      ...provider,
      configured: this.adapter(provider.code).isConfigured(),
      pollingConfigured: this.adapter(provider.code).isPollingConfigured(),
    }));
  }

  async getShipments() {
    const db = await this.db();
    return db.shipment.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true,
        order: {
          select: {
            id: true,
            reference: true,
            status: true,
            total: true,
            customer: { select: { name: true, phoneNormalized: true } },
            address: { select: { district: true, area: true } },
          },
        },
      },
    });
  }

  async getWebhookLogs() {
    const db = await this.db();
    return db.shipmentWebhookLog.findMany({
      where: { source: 'WEBHOOK' },
      take: 100,
      orderBy: { receivedAt: 'desc' },
    });
  }

  getPollingSupport(code: ShipmentProviderCode) {
    return this.adapter(code).isPollingConfigured();
  }

  async pollProviderShipment(
    code: ShipmentProviderCode,
    input: PollCourierShipmentInput,
  ) {
    const adapter = this.adapter(code);
    if (!adapter.isPollingConfigured() || !adapter.pollShipment) {
      throw new ConflictException(`${code} polling is not configured`);
    }
    return adapter.pollShipment(input);
  }

  processPolledPayload(
    provider: ShipmentProviderCode,
    body: Record<string, unknown>,
  ) {
    return this.processAuthenticatedWebhook(
      provider,
      body,
      undefined,
      undefined,
      'POLL',
    );
  }

  async updateProvider(
    code: ShipmentProviderCode,
    dto: UpdateShipmentProviderDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    if (!Object.values(ShipmentProviderCode).includes(code)) {
      throw new BadRequestException('Unsupported shipment provider');
    }
    if (dto.isActive && !this.adapter(code).isConfigured()) {
      throw new ConflictException(
        `${code} credentials must be configured before activation`,
      );
    }
    return db.$transaction(async (transaction) => {
      const previous = await transaction.shipmentProvider.findUniqueOrThrow({
        where: { code },
      });
      const updated = await transaction.shipmentProvider.update({
        where: { code },
        data: { isActive: dto.isActive },
      });
      await this.audit.record(
        {
          action: 'SHIPMENT_PROVIDER_STATUS_CHANGED',
          entityType: 'ShipmentProvider',
          entityId: updated.id,
          actor,
          previousValue: { code, isActive: previous.isActive },
          newValue: { code, isActive: updated.isActive },
        },
        transaction,
      );
      return updated;
    });
  }

  async getOrderShipment(orderId: string) {
    const db = await this.db();
    return db.shipment.findUnique({
      where: { orderId },
      include: shipmentInclude,
    });
  }

  async createShipment(
    orderId: string,
    dto: CreateShipmentDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        shipment: true,
        items: { include: { reservations: true } },
        fulfillmentExceptions: { where: { status: 'OPEN' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'CONFIRMED') {
      throw new ConflictException('Only confirmed orders can be shipped');
    }
    if (order.fulfillmentStatus !== 'READY_FOR_HANDOVER') {
      throw new ConflictException(
        'Complete packing and quality check before creating a shipment',
      );
    }
    if (order.fulfillmentExceptions.length > 0) {
      throw new ConflictException(
        'Resolve all fulfillment exceptions before creating a shipment',
      );
    }
    if (order.shipment) {
      throw new ConflictException('This order already has a shipment record');
    }
    if (!order.address)
      throw new ConflictException('Order address snapshot is missing');
    const reservedQuantity = order.items.reduce(
      (total, item) =>
        total +
        item.reservations
          .filter((reservation) => reservation.status === 'ACTIVE')
          .reduce((sum, reservation) => sum + reservation.quantity, 0),
      0,
    );
    const orderedQuantity = order.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    if (reservedQuantity !== orderedQuantity) {
      throw new ConflictException('A complete active reservation is required');
    }
    const provider = await db.shipmentProvider.findUnique({
      where: { code: dto.provider },
    });
    if (!provider?.isActive) {
      throw new ConflictException(`${dto.provider} is not active`);
    }
    const adapter = this.adapter(provider.code);
    if (!adapter.isConfigured()) {
      throw new ConflictException(
        `${dto.provider} credentials are not configured`,
      );
    }
    const weightGrams = order.items.reduce(
      (total, item) => total + item.weightGrams * item.quantity,
      0,
    );
    const recipientAddress = [
      order.address.detailedAddress,
      order.address.area,
      order.address.district,
      order.address.landmark,
    ]
      .filter(Boolean)
      .join(', ');
    const itemDescription = order.items
      .map(
        (item) =>
          `${item.productName} (${item.variantName}) × ${item.quantity}`,
      )
      .join('; ')
      .slice(0, 500);
    const request = {
      orderReference: order.reference,
      recipientName: order.address.recipientName,
      recipientPhone: this.localPhone(order.address.phoneNormalized),
      recipientAddress,
      recipientEmail: order.address.email ?? undefined,
      codAmount: order.total,
      weightGrams,
      itemQuantity: orderedQuantity,
      itemDescription,
      note: dto.note?.normalize('NFKC').trim(),
      providerData: dto.providerData,
    };
    const shipment = await db.shipment.create({
      data: {
        orderId,
        providerId: provider.id,
        weightGrams,
        codAmount: order.total,
        requestPayload: toTenantJsonInput(request) ?? {},
        createdByActorId: actor.userId,
      },
    });
    try {
      const result = await adapter.createShipment(request);
      const createdShipment = await db.$transaction(async (transaction) => {
        await transaction.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            deduplicationKey: this.hash(
              `${provider.code}:create:${result.externalShipmentId}`,
            ),
            rawStatus: result.rawStatus,
            normalizedStatus: result.normalizedStatus,
            payload: toTenantJsonInput(result.response) ?? {},
            occurredAt: new Date(),
          },
        });
        await transaction.order.update({
          where: { id: orderId },
          data: { shipmentStatus: result.normalizedStatus },
        });
        const created = await transaction.shipment.update({
          where: { id: shipment.id },
          data: {
            status: result.normalizedStatus,
            externalShipmentId: result.externalShipmentId,
            trackingNumber: result.trackingNumber,
            trackingUrl: result.trackingUrl,
            labelUrl: result.labelUrl,
            shippingCharge: result.shippingCharge,
            responsePayload: toTenantJsonInput(result.response) ?? {},
            lastRawStatus: result.rawStatus,
          },
          include: shipmentInclude,
        });
        await this.audit.record(
          {
            action: 'SHIPMENT_CREATED',
            entityType: 'Shipment',
            entityId: shipment.id,
            actor,
            newValue: {
              orderId,
              provider: provider.code,
              status: created.status,
              trackingNumber: created.trackingNumber,
              weightGrams,
              codAmount: order.total,
            },
          },
          transaction,
        );
        return created;
      });
      await this.messages.enqueueAfterCommit({
        eventType: 'SHIPMENT_CREATED',
        recipient: order.address.phoneNormalized,
        referenceType: 'Shipment',
        referenceId: shipment.id,
        payload: {
          orderReference: order.reference,
          trackingNumber: createdShipment.trackingNumber,
          trackingUrl: createdShipment.trackingUrl,
          provider: provider.name,
        },
      });
      return createdShipment;
    } catch (error) {
      await db.$transaction(async (transaction) => {
        const failed = await transaction.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'FAILED',
            exceptionReason:
              error instanceof Error ? error.message : 'Courier request failed',
          },
        });
        await this.audit.record(
          {
            action: 'SHIPMENT_CREATION_FAILED',
            entityType: 'Shipment',
            entityId: shipment.id,
            actor,
            newValue: { status: failed.status, provider: provider.code },
            metadata: {
              orderId,
              error: failed.exceptionReason,
            },
          },
          transaction,
        );
      });
      throw error;
    }
  }

  private async consumeDeliveredReservations(
    transaction: Prisma.TransactionClient,
    shipmentId: string,
    orderId: string,
  ) {
    const reservations = await transaction.inventoryReservation.findMany({
      where: { orderItem: { orderId }, status: 'ACTIVE' },
    });
    for (const reservation of reservations) {
      const stock = await transaction.inventoryStock.findUnique({
        where: { id: reservation.inventoryId },
      });
      if (
        !stock ||
        stock.reserved < reservation.quantity ||
        stock.onHand < reservation.quantity
      ) {
        throw new ConflictException('Delivered reservation is inconsistent');
      }
      await transaction.inventoryStock.update({
        where: { id: reservation.inventoryId },
        data: {
          reserved: { decrement: reservation.quantity },
          onHand: { decrement: reservation.quantity },
        },
      });
      await transaction.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'CONSUMED', consumedAt: new Date() },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryId: reservation.inventoryId,
          type: 'SALE',
          quantityDelta: -reservation.quantity,
          reason: 'Courier confirmed delivery',
          referenceType: 'Shipment',
          referenceId: shipmentId,
        },
      });
    }
  }

  async processWebhook(
    rawProvider: string,
    headers: Record<string, string | string[] | undefined>,
    body: Record<string, unknown>,
  ) {
    const db = await this.db();
    const provider = rawProvider.trim().toUpperCase() as ShipmentProviderCode;
    if (!Object.values(ShipmentProviderCode).includes(provider)) {
      throw new NotFoundException('Courier provider not found');
    }
    const adapter = this.adapter(provider);
    const authValid = adapter.verifyWebhook(headers);
    if (!authValid) {
      const attemptedAt = new Date();
      await db.shipmentWebhookLog.create({
        data: {
          providerCode: provider,
          deduplicationKey: this.hash(
            `${provider}:invalid-auth:${randomBytes(16).toString('hex')}`,
          ),
          headers: this.sanitizedHeaders(headers),
          body: toTenantJsonInput(body) ?? {},
          authValid: false,
          attemptCount: 1,
          lastAttemptAt: attemptedAt,
          processingError: 'Webhook authentication failed',
        },
      });
      throw new UnauthorizedException('Invalid courier webhook credentials');
    }
    return this.processAuthenticatedWebhook(provider, body, undefined, headers);
  }

  async retryWebhookLog(callbackLogId: string) {
    const db = await this.db();
    const log = await db.shipmentWebhookLog.findUnique({
      where: { id: callbackLogId },
    });
    if (!log) throw new NotFoundException('Courier callback not found');
    if (!log.authValid) {
      throw new ConflictException('Rejected callbacks cannot be retried');
    }
    if (log.processed) return { accepted: true, duplicate: true };
    return this.processAuthenticatedWebhook(
      log.providerCode,
      log.body as Record<string, unknown>,
      log.id,
    );
  }

  private async processAuthenticatedWebhook(
    provider: ShipmentProviderCode,
    body: Record<string, unknown>,
    retainedLogId?: string,
    headers?: Record<string, string | string[] | undefined>,
    source: 'WEBHOOK' | 'POLL' = 'WEBHOOK',
  ) {
    const db = await this.db();
    const adapter = this.adapter(provider);
    const event = adapter.parseWebhook(body);
    const deduplicationKey = this.hash(
      event.providerEventId
        ? `${provider}:${event.providerEventId}`
        : `${provider}:${JSON.stringify(body)}`,
    );
    let log = retainedLogId
      ? await db.shipmentWebhookLog.findUniqueOrThrow({
          where: { id: retainedLogId },
        })
      : await db.shipmentWebhookLog.findUnique({
          where: { deduplicationKey },
        });
    if (retainedLogId && log?.deduplicationKey !== deduplicationKey) {
      throw new ConflictException('Courier callback identity does not match');
    }
    if (!log) {
      try {
        log = await db.shipmentWebhookLog.create({
          data: {
            providerCode: provider,
            source,
            deduplicationKey,
            headers: this.sanitizedHeaders(headers ?? {}),
            body: toTenantJsonInput(body) ?? {},
            authValid: true,
          },
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          )
        ) {
          throw error;
        }
        log = await db.shipmentWebhookLog.findUniqueOrThrow({
          where: { deduplicationKey },
        });
      }
    }
    if (log.processed) {
      return {
        accepted: true,
        duplicate: true,
        ...(source === 'POLL'
          ? {
              evidenceLogId: log.id,
              normalizedStatus: event.normalizedStatus,
            }
          : {}),
      };
    }

    const attemptStartedAt = new Date();
    const claim = await db.shipmentWebhookLog.updateMany({
      where: {
        id: log.id,
        processed: false,
        OR: [
          { processingStartedAt: null },
          {
            processingStartedAt: {
              lt: new Date(
                attemptStartedAt.getTime() - WEBHOOK_PROCESSING_LEASE_MS,
              ),
            },
          },
          { processingError: { not: null } },
        ],
      },
      data: {
        attemptCount: { increment: 1 },
        processingStartedAt: attemptStartedAt,
        lastAttemptAt: attemptStartedAt,
        processingError: null,
      },
    });
    if (claim.count === 0) {
      return { accepted: true, duplicate: true, processing: true };
    }
    try {
      const shipmentMatchers: Prisma.ShipmentWhereInput[] = [];
      if (event.externalShipmentId) {
        shipmentMatchers.push({ externalShipmentId: event.externalShipmentId });
      }
      if (event.trackingNumber) {
        shipmentMatchers.push({ trackingNumber: event.trackingNumber });
      }
      if (event.orderReference) {
        shipmentMatchers.push({ order: { reference: event.orderReference } });
      }
      if (shipmentMatchers.length === 0) {
        throw new BadRequestException(
          'Courier event has no shipment identifier',
        );
      }
      const shipment = await db.shipment.findFirst({
        where: {
          provider: { code: provider },
          OR: shipmentMatchers,
        },
        include: {
          events: { orderBy: { occurredAt: 'desc' }, take: 1 },
          order: {
            include: {
              address: true,
              items: {
                include: {
                  reservations: { where: { status: 'ACTIVE' } },
                },
              },
            },
          },
        },
      });
      if (!shipment)
        throw new NotFoundException('Shipment not found for event');
      const occurredAt = Number.isNaN(event.occurredAt.getTime())
        ? new Date()
        : event.occurredAt;
      const latest = shipment.events[0];
      const outOfOrder = Boolean(latest && occurredAt < latest.occurredAt);
      const applicable =
        !outOfOrder &&
        canApplyShipmentStatus(shipment.status, event.normalizedStatus);
      await db.$transaction(async (transaction) => {
        await transaction.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            deduplicationKey,
            providerEventId: event.providerEventId,
            rawStatus: event.rawStatus,
            normalizedStatus: event.normalizedStatus,
            payload: toTenantJsonInput(body) ?? {},
            occurredAt,
            isOutOfOrder: outOfOrder,
            ignoredReason: applicable
              ? null
              : outOfOrder
                ? 'Older than the latest accepted event'
                : event.normalizedStatus === 'UNKNOWN'
                  ? 'Unknown provider status requires review'
                  : `Transition from ${shipment.status} is not allowed`,
          },
        });
        if (applicable) {
          const timestampData = {
            pickedUpAt:
              event.normalizedStatus === 'PICKED_UP' ? occurredAt : undefined,
            deliveredAt:
              event.normalizedStatus === 'DELIVERED' ? occurredAt : undefined,
            returnedAt: ['RETURNED', 'RTO'].includes(event.normalizedStatus)
              ? occurredAt
              : undefined,
            cancelledAt:
              event.normalizedStatus === 'CANCELLED' ? occurredAt : undefined,
          };
          await transaction.shipment.update({
            where: { id: shipment.id },
            data: {
              status: event.normalizedStatus,
              lastRawStatus: event.rawStatus,
              exceptionReason: null,
              ...timestampData,
            },
          });
          await transaction.order.update({
            where: { id: shipment.orderId },
            data: { shipmentStatus: event.normalizedStatus },
          });
          if (event.normalizedStatus === 'PICKED_UP') {
            const order = await transaction.order.findUnique({
              where: { id: shipment.orderId },
            });
            if (order && order.fulfillmentStatus === 'READY_FOR_HANDOVER') {
              await transaction.order.update({
                where: { id: shipment.orderId },
                data: { fulfillmentStatus: 'HANDED_OVER' },
              });
              await transaction.fulfillmentHistory.create({
                data: {
                  orderId: shipment.orderId,
                  oldStatus: order.fulfillmentStatus,
                  newStatus: 'HANDED_OVER',
                  source: 'SYSTEM',
                  note: `${provider} confirmed parcel pickup`,
                },
              });
            }
          }
          if (event.normalizedStatus === 'DELIVERED') {
            await this.consumeDeliveredReservations(
              transaction,
              shipment.id,
              shipment.orderId,
            );
            const order = await transaction.order.findUnique({
              where: { id: shipment.orderId },
            });
            if (order && order.status !== 'DELIVERED') {
              await transaction.order.update({
                where: { id: shipment.orderId },
                data: {
                  status: 'DELIVERED',
                  fulfillmentStatus: 'FULFILLED',
                },
              });
              await transaction.orderStatusHistory.create({
                data: {
                  orderId: shipment.orderId,
                  oldStatus: order.status,
                  newStatus: 'DELIVERED',
                  source: 'SYSTEM',
                  note: `${provider} confirmed parcel delivery`,
                },
              });
              await transaction.fulfillmentHistory.create({
                data: {
                  orderId: shipment.orderId,
                  oldStatus: order.fulfillmentStatus,
                  newStatus: 'FULFILLED',
                  source: 'SYSTEM',
                  note: `${provider} confirmed parcel delivery`,
                },
              });
            }
            if (shipment.order.paymentMethod === 'COD') {
              const collection = await transaction.codCollection.upsert({
                where: { shipmentId: shipment.id },
                update: {},
                create: {
                  shipmentId: shipment.id,
                  orderId: shipment.orderId,
                  currency: shipment.order.currency,
                  expectedAmount: shipment.codAmount,
                  expectedAt: occurredAt,
                },
              });
              await this.audit.record(
                {
                  action: 'COD_COLLECTION_EXPECTED',
                  entityType: 'CodCollection',
                  entityId: collection.id,
                  source: 'PROVIDER',
                  newValue: {
                    shipmentId: shipment.id,
                    orderId: shipment.orderId,
                    expectedAmount: shipment.codAmount,
                    currency: shipment.order.currency,
                  },
                },
                transaction,
              );
            }
          }
          if (['RETURNED', 'RTO'].includes(event.normalizedStatus)) {
            const items = shipment.order.items.flatMap((item) =>
              item.reservations.map((reservation) => ({
                orderItemId: item.id,
                reservationId: reservation.id,
                expectedQuantity: reservation.quantity,
              })),
            );
            const existingRto = await transaction.rtoCase.findUnique({
              where: { shipmentId: shipment.id },
            });
            if (!existingRto) {
              const rtoCase = await transaction.rtoCase.create({
                data: {
                  reference: this.rtoReference(),
                  shipmentId: shipment.id,
                  orderId: shipment.orderId,
                  courierReason: event.rawStatus,
                  outboundCourierCost: shipment.shippingCharge ?? 0,
                  totalCost: shipment.shippingCharge ?? 0,
                  courierReturnedAt: occurredAt,
                  items: { create: items },
                },
              });
              await this.audit.record(
                {
                  action: 'RTO_CASE_CREATED',
                  entityType: 'RtoCase',
                  entityId: rtoCase.id,
                  source: 'PROVIDER',
                  newValue: {
                    shipmentId: shipment.id,
                    orderId: shipment.orderId,
                    courierReason: event.rawStatus,
                    expectedQuantity: items.reduce(
                      (total, item) => total + item.expectedQuantity,
                      0,
                    ),
                  },
                },
                transaction,
              );
            }
          }
        } else if (event.normalizedStatus === 'UNKNOWN') {
          await transaction.shipment.update({
            where: { id: shipment.id },
            data: {
              exceptionReason: `Unknown courier status: ${event.rawStatus}`,
            },
          });
        }
        await transaction.shipmentWebhookLog.update({
          where: { id: log.id },
          data: {
            processed: true,
            processedAt: new Date(),
            processingStartedAt: null,
            processingError: null,
          },
        });
      });
      if (applicable && shipment.order.address) {
        await this.messages.enqueueAfterCommit({
          eventType: `SHIPMENT_${event.normalizedStatus}`,
          recipient: shipment.order.address.phoneNormalized,
          referenceType: 'Shipment',
          referenceId: shipment.id,
          occurrenceKey: deduplicationKey,
          payload: {
            orderReference: shipment.order.reference,
            shipmentStatus: event.normalizedStatus,
            trackingNumber: shipment.trackingNumber,
          },
        });
      }
      return {
        accepted: true,
        duplicate: false,
        applied: applicable,
        ...(source === 'POLL'
          ? {
              evidenceLogId: log.id,
              normalizedStatus: event.normalizedStatus,
            }
          : {}),
      };
    } catch (error) {
      await db.shipmentWebhookLog.update({
        where: { id: log.id },
        data: {
          processingStartedAt: null,
          processingError:
            error instanceof Error
              ? error.message
              : 'Webhook processing failed',
        },
      });
      throw error;
    }
  }

  async getScorecard() {
    const db = await this.db();
    const providers = await db.shipmentProvider.findMany();
    const shipments = await db.shipment.findMany({
      select: {
        providerId: true,
        status: true,
        weightGrams: true,
        shippingCharge: true,
        createdAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        returnedAt: true,
      },
    });

    return providers.map((provider) => {
      const pShipments = shipments.filter((s) => s.providerId === provider.id);
      const total = pShipments.length;
      const delivered = pShipments.filter(
        (s) => s.status === 'DELIVERED',
      ).length;
      const rto = pShipments.filter(
        (s) => s.status === 'RTO' || s.status === 'RETURNED',
      ).length;
      const pickedUp = pShipments.filter((s) => s.pickedUpAt !== null).length;

      const deliveryRate =
        total > 0 ? Math.round((delivered / total) * 100) : 0;
      const rtoRate = total > 0 ? Math.round((rto / total) * 100) : 0;
      const pickupSlaRate =
        total > 0 ? Math.round((pickedUp / total) * 100) : 0;

      return {
        providerCode: provider.code,
        name: provider.name,
        isActive: provider.isActive,
        totalParcels: total,
        deliveredParcels: delivered,
        rtoParcels: rto,
        deliveryRatePercent: deliveryRate,
        rtoPercent: rtoRate,
        pickupSlaPercent: pickupSlaRate,
      };
    });
  }
}
