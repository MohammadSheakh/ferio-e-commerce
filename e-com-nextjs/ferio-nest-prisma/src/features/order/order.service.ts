import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { tryGetTenantContext } from '../../tenancy/tenant-context';
import type { UserPayload } from '@app/common';
import { CartService } from '../cart/cart.service';
import { TransactionalMessagingService } from '../transactional-messaging/services/transactional-messaging.service';
import { AuditService } from '../audit/services/audit.service';
import {
  calculateDeliveryFee,
  normalizeBangladeshPhone,
} from '../checkout/utils/checkout.util';
import { calculateCouponDiscount } from '../checkout/utils/coupon.util';
import {
  CancelOrderDto,
  ConfirmOrderDto,
  CreateFulfillmentExceptionDto,
  OrderQueryDto,
  ResolveFulfillmentExceptionDto,
  TrackOrderDto,
  UpdateCodPolicyDto,
  UpdateFulfillmentDto,
} from './dto/order.dto';
import {
  canCancelOrder,
  canConfirmOrder,
  nextFulfillmentStatus,
  orderStatusLabel,
  requiresCodVerification,
  shipmentStatusLabel,
} from './utils/order.util';
import { buildOrderOperationalTimeline } from './utils/order-timeline.util';
import { WalletService } from '../wallet/wallet.service';
import { CustomerNotificationsService } from '../customer-notifications/customer-notifications.service';

const orderDetailInclude = {
  customer: true,
  address: true,
  pickupStore: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      reservations: {
        include: { inventory: { include: { warehouse: true } } },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  fulfillmentHistory: { orderBy: { createdAt: 'asc' as const } },
  fulfillmentExceptions: {
    orderBy: { createdAt: 'asc' as const },
    include: { orderItem: true },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly messages: TransactionalMessagingService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly wallet: WalletService,
    private readonly customerNotifications: CustomerNotificationsService,
    @Optional() private readonly tenantDb?: TenantDbService,
    @Optional()
    private readonly entitlements?: import('../../platform/services/entitlements.service').EntitlementsService,
    @Optional()
    private readonly usage?: import('../../platform/services/usage.service').UsageService,
  ) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one (legacy mode, platform workers pre-MT-8) it
   * explicitly falls back to the legacy single-tenant DB. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }
  private hashIdempotencyKey(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private timingSafeEqualStrings(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Compare against self to keep timing uniform, then fail.
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  private orderReference(prefix = 'FER'): string {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `${prefix}-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private cleanIdempotencyKey(value?: string): string {
    const key = value?.trim();
    if (!key || key.length < 16 || key.length > 200) {
      throw new BadRequestException('A valid idempotency key is required');
    }
    return key;
  }

  private serializeOrder(
    order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>,
  ) {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      shipmentStatus: order.shipmentStatus,
      returnStatus: order.returnStatus,
      refundStatus: order.refundStatus,
      codVerification: order.codVerification,
      deliveryMethod: order.deliveryMethod,
      pickupStoreId: order.pickupStoreId,
      pickupStore: order.pickupStore,
      preferredPickupDate: order.preferredPickupDate,
      preferredPickupSlot: order.preferredPickupSlot,
      storePickupStatus: order.storePickupStatus,
      storePickupOtp: order.storePickupOtp,
      customerPickupNotes: order.customerPickupNotes,
      pickupScheduledAt: order.pickupScheduledAt,
      paymentMethod: order.paymentMethod,
      currency: order.currency,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      deliveryFee: order.deliveryFee,
      paymentCharge: order.paymentCharge,
      total: order.total,
      source: order.source,
      medium: order.medium,
      campaign: order.campaign,
      customerNote: order.customerNote,
      cancellationReason: order.cancellationReason,
      confirmedAt: order.confirmedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phoneNormalized,
        email: order.customer.email,
      },
      address: order.address,
      items: order.items,
      statusHistory: order.statusHistory,
      fulfillmentHistory: order.fulfillmentHistory,
      fulfillmentExceptions: order.fulfillmentExceptions,
    };
  }

  private serializeConfirmation(
    order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>,
  ) {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      codVerification: order.codVerification,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt,
    };
  }

  private async loadDetailedOrder(id: string) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async enqueueOrderEvents(
    order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>,
    eventTypes: string[],
  ) {
    if (!order.address) return;
    const recipient =
      order.address.phoneNormalized ||
      order.address.phoneOriginal ||
      order.address.email;
    if (!recipient) return;
    for (const eventType of eventTypes) {
      await this.messages.enqueueAfterCommit({
        eventType,
        recipient,
        referenceType: 'Order',
        referenceId: order.id,
        payload: {
          reference: order.reference,
          status: order.status,
          total: order.total,
          currency: order.currency,
        },
      });
      const copy = {
        ORDER_PLACED: {
          title: 'Order received',
          message: `Your order ${order.reference} has been received.`,
        },
        ORDER_CONFIRMED: {
          title: 'Order confirmed',
          message: `Your order ${order.reference} is confirmed and moving to fulfillment.`,
        },
        ORDER_CANCELLED: {
          title: 'Order cancelled',
          message: `Your order ${order.reference} was cancelled.`,
        },
      }[eventType];
      if (copy) {
        await this.customerNotifications.notifyCustomer(order.customerId, {
          deduplicationKey: `order:${order.id}:${eventType}`,
          type: 'order',
          title: copy.title,
          message: copy.message,
          entityType: 'Order',
          entityId: order.id,
          linkFor: '/account/orders',
          linkId: order.id,
          data: { reference: order.reference, status: order.status },
        });
      }
    }
  }

  private async resolveWalletCustomer(
    transaction: Prisma.TransactionClient,
    userId: string,
    draft: {
      name: string;
      email: string | null;
    },
  ) {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { role: true, isDeleted: true, customerId: true },
    });
    if (!user || user.isDeleted || user.role !== 'user' || !user.customerId) {
      throw new ConflictException(
        'Open your account once before using wallet checkout',
      );
    }
    return transaction.customer.update({
      where: { id: user.customerId },
      data: {
        name: draft.name,
        ...(draft.email ? { email: draft.email } : {}),
      },
    });
  }

  private async recordOrderUsage(): Promise<void> {
    try {
      const ctx = tryGetTenantContext();
      if (ctx && this.usage) {
        await this.usage.increment(ctx.organizationId, 'orders_per_month', 1);
      }
    } catch {
      // Metering must never fail an order.
    }
  }

  private async confirmationAfterCommit(
    order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>,
  ) {
    await this.enqueueOrderEvents(order, [
      'ORDER_PLACED',
      ...(order.status === 'CONFIRMED' ? ['ORDER_CONFIRMED'] : []),
    ]);
    // Non-blocking SaaS usage metering (MT-10 §9.4): never fails an order.
    void this.recordOrderUsage();
    return this.serializeConfirmation(order);
  }

  private async resolveCustomer(
    transaction: Prisma.TransactionClient,
    draft: {
      name: string;
      phoneOriginal: string;
      phoneNormalized: string;
      email: string | null;
      district: string;
      area: string;
      detailedAddress: string;
      landmark: string | null;
      latitude: number | null;
      longitude: number | null;
    },
  ) {
    const candidate = await transaction.customer.findFirst({
      where: {
        OR: [
          { phoneNormalized: draft.phoneNormalized },
          ...(draft.email ? [{ email: draft.email }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const customer = candidate
      ? await transaction.customer.update({
          where: { id: candidate.id },
          data: {
            email: candidate.email ?? draft.email,
            name: candidate.name || draft.name,
          },
        })
      : await transaction.customer.create({
          data: {
            name: draft.name,
            phoneOriginal: draft.phoneOriginal,
            phoneNormalized: draft.phoneNormalized,
            email: draft.email,
          },
        });
    const existingAddress = await transaction.customerAddress.findFirst({
      where: {
        customerId: customer.id,
        district: { equals: draft.district, mode: 'insensitive' },
        area: { equals: draft.area, mode: 'insensitive' },
        detailedAddress: { equals: draft.detailedAddress, mode: 'insensitive' },
      },
    });

    if (!existingAddress) {
      const addressCount = await transaction.customerAddress.count({
        where: { customerId: customer.id },
      });
      await transaction.customerAddress.create({
        data: {
          customerId: customer.id,
          recipientName: draft.name,
          phoneOriginal: draft.phoneOriginal,
          phoneNormalized: draft.phoneNormalized,
          district: draft.district,
          area: draft.area,
          detailedAddress: draft.detailedAddress,
          landmark: draft.landmark,
          latitude: draft.latitude,
          longitude: draft.longitude,
          isDefault: addressCount === 0,
        },
      });
    }
    return customer;
  }

  private async reserveOrderItems(
    transaction: Prisma.TransactionClient,
    orderItems: Array<{ id: string; variantId: string; quantity: number }>,
    orderId: string,
    actorId?: string,
    expiresAt?: Date,
  ) {
    for (const item of orderItems) {
      const stocks = await transaction.inventoryStock.findMany({
        where: { variantId: item.variantId },
        orderBy: { warehouse: { code: 'asc' } },
      });
      const available = stocks.reduce(
        (total, stock) =>
          total + Math.max(0, stock.onHand - stock.reserved - stock.damaged),
        0,
      );
      if (available < item.quantity) {
        throw new ConflictException(
          `Insufficient stock to confirm order item ${item.id}`,
        );
      }
      let remaining = item.quantity;
      for (const stock of stocks) {
        if (remaining === 0) break;
        const stockAvailable = Math.max(
          0,
          stock.onHand - stock.reserved - stock.damaged,
        );
        const quantity = Math.min(remaining, stockAvailable);
        if (quantity === 0) continue;
        await transaction.inventoryStock.update({
          where: { id: stock.id },
          data: { reserved: { increment: quantity } },
        });
        await transaction.inventoryReservation.create({
          data: {
            inventoryId: stock.id,
            orderItemId: item.id,
            quantity,
            expiresAt,
          },
        });
        await transaction.inventoryMovement.create({
          data: {
            inventoryId: stock.id,
            type: 'RESERVE',
            quantityDelta: quantity,
            reason: 'Order confirmed',
            referenceType: 'Order',
            referenceId: orderId,
            actorId,
          },
        });
        remaining -= quantity;
      }
    }
  }

  async confirmVerifiedPrepaidOrder(
    transaction: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== 'PREPAID') {
      throw new ConflictException('Order is not a prepaid order');
    }
    if (order.paymentStatus === 'PAID') return order;
    if (order.status !== 'PENDING_CONFIRMATION') {
      throw new ConflictException(
        `Prepaid order cannot be confirmed from ${order.status}`,
      );
    }
    const activeReservations = await transaction.inventoryReservation.count({
      where: {
        orderItem: { orderId: order.id },
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });
    if (activeReservations === 0) {
      throw new ConflictException(
        'Prepaid stock reservation expired; payment requires manual review',
      );
    }
    const updated = await transaction.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        fulfillmentStatus: 'READY_FOR_FULFILLMENT',
        confirmedAt: new Date(),
      },
    });
    await transaction.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: 'CONFIRMED',
        source: 'SYSTEM',
        note: 'Prepaid payment verified; order confirmed',
      },
    });
    await transaction.fulfillmentHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.fulfillmentStatus,
        newStatus: 'READY_FOR_FULFILLMENT',
        source: 'SYSTEM',
        note: 'Verified prepaid order queued for fulfillment',
      },
    });
    return updated;
  }

  async preparePrepaidRetry(
    transaction: Prisma.TransactionClient,
    orderId: string,
    expiresAt: Date,
  ) {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.paymentMethod !== 'PREPAID') {
      throw new ConflictException('Prepaid order is unavailable');
    }
    if (
      order.paymentStatus === 'PAID' ||
      order.status !== 'PENDING_CONFIRMATION'
    ) {
      throw new ConflictException('Prepaid order is not eligible for retry');
    }
    const validReservations = await transaction.inventoryReservation.count({
      where: {
        orderItem: { orderId },
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });
    if (validReservations === 0) {
      await this.releaseReservations(
        transaction,
        orderId,
        'Expired prepaid reservation released before retry',
        'SYSTEM_PAYMENT',
      );
      await this.reserveOrderItems(
        transaction,
        order.items,
        order.id,
        undefined,
        expiresAt,
      );
    }
    await transaction.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'UNPAID' },
    });
  }

  async expirePrepaidOrder(
    transaction: Prisma.TransactionClient,
    orderId: string,
  ) {
    const paid = await transaction.order.count({
      where: { id: orderId, paymentStatus: 'PAID' },
    });
    if (paid > 0) return;
    await this.releaseReservations(
      transaction,
      orderId,
      'Prepaid payment window expired',
      'SYSTEM_PAYMENT',
    );
    await transaction.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'FAILED' },
    });
  }

  private async releaseReservations(
    transaction: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    actorId: string,
  ) {
    const reservations = await transaction.inventoryReservation.findMany({
      where: { orderItem: { orderId }, status: 'ACTIVE' },
    });
    for (const reservation of reservations) {
      const stock = await transaction.inventoryStock.findUnique({
        where: { id: reservation.inventoryId },
      });
      if (!stock || stock.reserved < reservation.quantity) {
        throw new ConflictException('Inventory reservation is inconsistent');
      }
      await transaction.inventoryStock.update({
        where: { id: reservation.inventoryId },
        data: { reserved: { decrement: reservation.quantity } },
      });
      await transaction.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryId: reservation.inventoryId,
          type: 'RELEASE',
          quantityDelta: -reservation.quantity,
          reason,
          referenceType: 'Order',
          referenceId: orderId,
          actorId,
        },
      });
    }
  }

  /**
   * Consume ACTIVE reservations when a store-pickup handover completes.
   * Mirrors the courier delivery accounting (ShippingService) so inventory
   * stays consistent regardless of fulfilment channel.
   */
  private async consumeDeliveredReservations(
    transaction: Prisma.TransactionClient,
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
          reason: 'Store pickup handover completed',
          referenceType: 'Order',
          referenceId: orderId,
        },
      });
    }
  }

  async getCodPolicy() {
    const db = await this.db();
    return db.codVerificationPolicy.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', mode: 'ALWAYS' },
    });
  }

  async updateCodPolicy(dto: UpdateCodPolicyDto, actor: UserPayload) {
    const db = await this.db();
    return db.$transaction(async (transaction) => {
      const previous = await transaction.codVerificationPolicy.findUnique({
        where: { id: 'default' },
      });
      const updated = await transaction.codVerificationPolicy.upsert({
        where: { id: 'default' },
        update: {
          mode: dto.mode,
          amountThreshold:
            dto.mode === 'ABOVE_AMOUNT' ? dto.amountThreshold : null,
        },
        create: {
          id: 'default',
          mode: dto.mode,
          amountThreshold:
            dto.mode === 'ABOVE_AMOUNT' ? dto.amountThreshold : null,
        },
      });
      await this.audit.record(
        {
          action: 'COD_POLICY_UPDATED',
          entityType: 'CodVerificationPolicy',
          entityId: updated.id,
          actor,
          previousValue: previous,
          newValue: updated,
        },
        transaction,
      );
      return updated;
    });
  }

  async placeOrder(
    paymentMethod: 'COD' | 'PREPAID' | 'PAY_AT_STORE' | 'WALLET',
    cartToken?: string,
    rawIdempotencyKey?: string,
    actor?: UserPayload,
  ) {
    const db = await this.db();
    if (paymentMethod === 'WALLET' && !actor) {
      throw new BadRequestException('Sign in to pay with your wallet');
    }
    // PO-005: suspended tenants keep browsing + admin visibility but new
    // checkout is disabled. Stable code drives both UI and API behavior.
    const tenantContext = tryGetTenantContext();
    if (tenantContext && tenantContext.subscriptionStatus === 'SUSPENDED') {
      throw new ForbiddenException('CHECKOUT_DISABLED_SUSPENDED');
    }
    // MT-10 §13.2: plan limits enforced server-side at the monetizable event.
    if (tenantContext && this.entitlements) {
      const decision = await this.entitlements
        .evaluate(tenantContext.organizationId, 'orders_per_month', {
          requestedCount: 1,
        })
        .catch(() => null);
      if (decision && !decision.allowed) {
        throw new ForbiddenException(decision.code ?? 'PLAN_LIMIT_REACHED');
      }
    }
    const idempotencyKey = this.cleanIdempotencyKey(rawIdempotencyKey);
    const idempotencyKeyHash = this.hashIdempotencyKey(idempotencyKey);
    const existing = await db.order.findUnique({
      where: { idempotencyKeyHash },
      include: orderDetailInclude,
    });
    if (existing) return this.confirmationAfterCommit(existing);

    const validatedCart = await this.cartService.validateCart(cartToken);
    if (!validatedCart.id || validatedCart.items.length === 0) {
      throw new BadRequestException('A valid cart is required');
    }
    if (!validatedCart.isValid) {
      throw new ConflictException('Resolve cart availability issues first');
    }
    if (
      paymentMethod === 'COD' &&
      validatedCart.items.some((item) => !item.codAvailable)
    ) {
      throw new ConflictException(
        'Cash on delivery is unavailable for this cart',
      );
    }

    try {
      const orderId = await db.$transaction(
        async (transaction) => {
          const cart = await transaction.cart.findUnique({
            where: { id: validatedCart.id },
            include: {
              checkoutDraft: { include: { deliveryZone: true } },
              items: {
                orderBy: { createdAt: 'asc' },
                include: {
                  variant: {
                    include: {
                      product: {
                        include: {
                          media: { orderBy: { sortOrder: 'asc' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          });
          if (!cart || cart.status !== 'ACTIVE') {
            throw new ConflictException('Cart is no longer active');
          }
          const draft = cart.checkoutDraft;
          if (!draft || draft.expiresAt <= new Date() || !draft.termsAccepted) {
            throw new ConflictException('Generate a fresh checkout preview');
          }
          if (draft.paymentMethod !== paymentMethod) {
            throw new ConflictException(
              'Payment method changed; preview checkout again',
            );
          }
          if (draft.subtotal !== validatedCart.subtotal) {
            throw new ConflictException(
              'Cart pricing changed; preview checkout again',
            );
          }
          const coupon = calculateCouponDiscount(
            this.config.get<string>('CHECKOUT_COUPONS_JSON'),
            draft.couponCode ?? undefined,
            validatedCart.subtotal,
          );
          if (coupon.discountTotal !== draft.discountTotal) {
            throw new ConflictException(
              'Coupon pricing changed; preview checkout again',
            );
          }
          const deliveryFee = calculateDeliveryFee(
            validatedCart.subtotal,
            draft.deliveryZone.deliveryFee,
            draft.deliveryZone.freeDeliveryThreshold,
          );
          const total =
            validatedCart.subtotal -
            draft.discountTotal +
            deliveryFee +
            draft.paymentCharge;
          if (deliveryFee !== draft.deliveryFee || total !== draft.total) {
            throw new ConflictException(
              'Delivery pricing changed; preview checkout again',
            );
          }

          const customer =
            paymentMethod === 'WALLET'
              ? await this.resolveWalletCustomer(
                  transaction,
                  actor!.userId,
                  draft,
                )
              : await this.resolveCustomer(transaction, draft);
          const commerceSettings = await transaction.commerceSettings.upsert({
            where: { id: 'default' },
            update: {},
            create: {
              id: 'default',
              storeName: 'Ferio',
              currency: 'BDT',
              timezone: 'Asia/Dhaka',
              orderPrefix: 'FER',
            },
          });
          if (paymentMethod === 'COD' && !commerceSettings.codEnabled) {
            throw new ConflictException(
              'Cash on delivery is currently unavailable',
            );
          }
          if (paymentMethod === 'PREPAID' && !commerceSettings.prepaidEnabled) {
            throw new ConflictException(
              'Prepaid payment is currently unavailable',
            );
          }
          const policy = await transaction.codVerificationPolicy.upsert({
            where: { id: 'default' },
            update: {},
            create: { id: 'default', mode: 'ALWAYS' },
          });
          const verificationRequired =
            paymentMethod === 'COD' &&
            requiresCodVerification(policy.mode, total, policy.amountThreshold);
          const initialStatus: OrderStatus =
            paymentMethod === 'PREPAID' || verificationRequired
              ? 'PENDING_CONFIRMATION'
              : 'CONFIRMED';
          const isStorePickup = draft.deliveryMethod === 'STORE_PICKUP';
          const storePickupOtp = isStorePickup
            ? String(randomInt(0, 1_000_000)).padStart(6, '0')
            : null;

          const order = await transaction.order.create({
            data: {
              reference: this.orderReference(commerceSettings.orderPrefix),
              idempotencyKeyHash,
              paymentMethod,
              deliveryMethod: draft.deliveryMethod,
              pickupStoreId: draft.pickupStoreId,
              preferredPickupDate: draft.preferredPickupDate,
              preferredPickupSlot: draft.preferredPickupSlot,
              storePickupStatus: draft.storePickupStatus,
              storePickupOtp,
              status: initialStatus,
              paymentStatus: paymentMethod === 'WALLET' ? 'PAID' : 'UNPAID',
              fulfillmentStatus:
                verificationRequired || paymentMethod === 'PREPAID'
                  ? 'UNFULFILLED'
                  : 'READY_FOR_FULFILLMENT',
              codVerification: verificationRequired
                ? 'REQUIRED'
                : 'NOT_REQUIRED',
              confirmedAt:
                verificationRequired || paymentMethod === 'PREPAID'
                  ? null
                  : new Date(),
              subtotal: validatedCart.subtotal,
              discountTotal: draft.discountTotal,
              couponCode: draft.couponCode,
              deliveryFee,
              paymentCharge: draft.paymentCharge,
              total,
              currency: commerceSettings.currency,
              source: draft.source,
              medium: draft.medium,
              campaign: draft.campaign,
              customerNote: draft.customerNote,
              purchaseActivityConsent: draft.purchaseActivityConsent,
              customerId: customer.id,
              checkoutDraftId: draft.id,
              address: {
                create: {
                  recipientName: draft.name,
                  phoneOriginal: draft.phoneOriginal,
                  phoneNormalized: draft.phoneNormalized,
                  email: draft.email,
                  district: draft.district,
                  area: draft.area,
                  detailedAddress: draft.detailedAddress,
                  landmark: draft.landmark,
                  latitude: draft.latitude,
                  longitude: draft.longitude,
                },
              },
              statusHistory: {
                create: {
                  newStatus: initialStatus,
                  source: 'CUSTOMER',
                  note: verificationRequired
                    ? 'COD order placed and awaiting confirmation'
                    : paymentMethod === 'COD'
                      ? 'COD order placed and auto-confirmed by policy'
                      : paymentMethod === 'WALLET'
                        ? 'Order paid from customer wallet and confirmed'
                        : 'Prepaid order created and awaiting verified payment',
                },
              },
              fulfillmentHistory:
                verificationRequired || paymentMethod === 'PREPAID'
                  ? undefined
                  : {
                      create: {
                        oldStatus: 'UNFULFILLED',
                        newStatus: 'READY_FOR_FULFILLMENT',
                        source: 'SYSTEM',
                        note: 'Order auto-confirmed and queued for fulfillment',
                      },
                    },
            },
          });
          const orderItems: Array<{
            id: string;
            variantId: string;
            quantity: number;
          }> = [];
          for (const cartItem of cart.items) {
            const line = validatedCart.items.find(
              (entry) => entry.variantId === cartItem.variantId,
            );
            if (!line) throw new ConflictException('Cart contents changed');
            const image = cartItem.variant.product.media.find(
              (media) => media.type === 'IMAGE',
            )?.url;
            orderItems.push(
              await transaction.orderItem.create({
                data: {
                  orderId: order.id,
                  variantId: cartItem.variantId,
                  productIdSnapshot: cartItem.variant.productId,
                  productName: cartItem.variant.product.name,
                  variantName: cartItem.variant.name,
                  sku: cartItem.variant.sku,
                  attributes: cartItem.variant.attributes ?? undefined,
                  imageUrl: image,
                  productCondition: cartItem.variant.product.condition,
                  conditionGrade: cartItem.variant.product.conditionGrade,
                  conditionNote: cartItem.variant.product.conditionNote,
                  unitPrice: line.currentUnitPrice,
                  weightGrams: cartItem.variant.weightGrams ?? 500,
                  quantity: line.quantity,
                  lineTotal: line.lineTotal,
                },
              }),
            );
          }
          if (
            !verificationRequired &&
            (paymentMethod === 'COD' || paymentMethod === 'WALLET')
          ) {
            await this.reserveOrderItems(transaction, orderItems, order.id);
          }
          if (paymentMethod === 'PREPAID') {
            await this.reserveOrderItems(
              transaction,
              orderItems,
              order.id,
              undefined,
              new Date(Date.now() + 30 * 60 * 1000),
            );
          }
          if (paymentMethod === 'WALLET') {
            await this.wallet.debitOrder(
              transaction,
              actor!.userId,
              order.id,
              total,
            );
          }
          await transaction.cart.update({
            where: { id: cart.id },
            data: { status: 'CONVERTED' },
          });
          await this.audit.record(
            {
              action: 'ORDER_PLACED',
              entityType: 'Order',
              entityId: order.id,
              source: 'SYSTEM',
              newValue: {
                reference: order.reference,
                status: order.status,
                paymentMethod: order.paymentMethod,
                total: order.total,
                currency: order.currency,
              },
              metadata: { cartId: cart.id, customerId: customer.id },
            },
            transaction,
          );
          return order.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.confirmationAfterCommit(
        await this.loadDetailedOrder(orderId),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await db.order.findUnique({
          where: { idempotencyKeyHash },
          include: orderDetailInclude,
        });
        if (duplicate) return this.confirmationAfterCommit(duplicate);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        const duplicate = await db.order.findUnique({
          where: { idempotencyKeyHash },
          include: orderDetailInclude,
        });
        if (duplicate) return this.confirmationAfterCommit(duplicate);
        throw new ConflictException('Stock changed; retry the order safely');
      }
      throw error;
    }
  }

  async getOrders(query: OrderQueryDto) {
    const db = await this.db();
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      paymentStatus: query.paymentStatus,
      fulfillmentStatus: query.fulfillmentStatus,
      createdAt:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      OR: search
        ? [
            { reference: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { phoneNormalized: { contains: search } } },
            { address: { phoneOriginal: { contains: search } } },
            {
              shipment: {
                trackingNumber: { contains: search, mode: 'insensitive' },
              },
            },
            {
              shipment: {
                externalShipmentId: { contains: search, mode: 'insensitive' },
              },
            },
            {
              shipment: {
                provider: { name: { contains: search, mode: 'insensitive' } },
              },
            },
          ]
        : undefined,
    };
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          codVerification: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { id: true, name: true, phoneNormalized: true } },
          address: { select: { district: true, area: true } },
          shipment: {
            select: {
              trackingNumber: true,
              provider: { select: { name: true, code: true } },
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);
    const totalPages = Math.ceil(total / query.limit) || 1;
    return {
      items,
      results: items,
      data: items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  async getOrder(id: string) {
    const db = await this.db();
    const order = await this.loadDetailedOrder(id);
    const shipment = await db.shipment.findUnique({
      where: { orderId: id },
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        createdAt: true,
        provider: { select: { name: true } },
        events: {
          orderBy: { occurredAt: 'asc' },
          select: {
            id: true,
            normalizedStatus: true,
            rawStatus: true,
            ignoredReason: true,
            occurredAt: true,
          },
        },
      },
    });
    const messageReferences = [
      { referenceType: 'Order', referenceId: id },
      ...(shipment
        ? [{ referenceType: 'Shipment', referenceId: shipment.id }]
        : []),
    ];
    const [payments, returnCases, refunds, messages] = await Promise.all([
      db.commercePaymentAttempt.findMany({
        where: { orderId: id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
          completedAt: true,
          callbacks: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              eventType: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      db.returnCase.findMany({
        where: { orderId: id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          rmaReference: true,
          status: true,
          createdAt: true,
          history: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              newStatus: true,
              note: true,
              createdAt: true,
            },
          },
        },
      }),
      db.commerceRefund.findMany({
        where: { orderId: id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          reference: true,
          status: true,
          amount: true,
          currency: true,
          method: true,
          createdAt: true,
          completedAt: true,
          attempts: {
            orderBy: { attemptNumber: 'asc' },
            select: {
              id: true,
              attemptNumber: true,
              outcome: true,
              executionMode: true,
              provider: true,
              createdAt: true,
            },
          },
        },
      }),
      db.commerceMessage.findMany({
        where: { OR: messageReferences },
        orderBy: { createdAt: 'asc' },
        take: 100,
        select: {
          id: true,
          eventType: true,
          status: true,
          templateVersion: true,
          renderedBody: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      ...this.serializeOrder(order),
      operationalTimeline: buildOrderOperationalTimeline({
        order,
        shipment,
        payments,
        returns: returnCases,
        refunds,
        messages,
      }),
    };
  }

  async confirmOrder(id: string, dto: ConfirmOrderDto, actor: UserPayload) {
    const db = await this.db();
    try {
      await db.$transaction(
        async (transaction) => {
          const order = await transaction.order.findUnique({
            where: { id },
            include: { items: true },
          });
          if (!order) throw new NotFoundException('Order not found');
          if (!canConfirmOrder(order.status)) {
            throw new ConflictException(
              `Order cannot be confirmed from ${order.status}`,
            );
          }
          await this.reserveOrderItems(
            transaction,
            order.items,
            order.id,
            actor.userId,
          );
          await transaction.order.update({
            where: { id },
            data: {
              status: 'CONFIRMED',
              codVerification: 'VERIFIED',
              fulfillmentStatus: 'READY_FOR_FULFILLMENT',
              confirmedAt: new Date(),
            },
          });
          await transaction.orderStatusHistory.create({
            data: {
              orderId: id,
              oldStatus: order.status,
              newStatus: 'CONFIRMED',
              source: 'ADMIN',
              actorId: actor.userId,
              note: dto.note?.normalize('NFKC').trim() || 'COD order confirmed',
            },
          });
          await transaction.fulfillmentHistory.create({
            data: {
              orderId: id,
              oldStatus: order.fulfillmentStatus,
              newStatus: 'READY_FOR_FULFILLMENT',
              source: 'ADMIN',
              actorId: actor.userId,
              note: 'Order confirmed and queued for fulfillment',
            },
          });
          await this.audit.record(
            {
              action: 'ORDER_CONFIRMED',
              entityType: 'Order',
              entityId: id,
              actor,
              previousValue: {
                status: order.status,
                fulfillmentStatus: order.fulfillmentStatus,
                codVerification: order.codVerification,
              },
              newValue: {
                status: 'CONFIRMED',
                fulfillmentStatus: 'READY_FOR_FULFILLMENT',
                codVerification: 'VERIFIED',
              },
              metadata: { note: dto.note?.normalize('NFKC').trim() || null },
            },
            transaction,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Stock changed while confirming; retry');
      }
      throw error;
    }
    const order = await this.loadDetailedOrder(id);
    await this.enqueueOrderEvents(order, ['ORDER_CONFIRMED']);
    return this.serializeOrder(order);
  }

  async cancelOrder(id: string, dto: CancelOrderDto, actor: UserPayload) {
    const db = await this.db();
    try {
      await db.$transaction(
        async (transaction) => {
          const order = await transaction.order.findUnique({ where: { id } });
          if (!order) throw new NotFoundException('Order not found');
          if (!canCancelOrder(order.status)) {
            throw new ConflictException(
              `Order cannot be cancelled from ${order.status}`,
            );
          }
          const reason = dto.reason.normalize('NFKC').trim();
          await this.releaseReservations(transaction, id, reason, actor.userId);
          if (
            order.paymentMethod === 'WALLET' &&
            order.paymentStatus === 'PAID'
          ) {
            await this.wallet.refundCancelledOrder(
              transaction,
              order.customerId,
              order.id,
              order.total,
            );
          }
          await transaction.order.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              fulfillmentStatus: 'CANCELLED',
              paymentStatus:
                order.paymentMethod === 'WALLET' &&
                order.paymentStatus === 'PAID'
                  ? 'REFUNDED'
                  : order.paymentStatus,
              refundStatus:
                order.paymentMethod === 'WALLET' &&
                order.paymentStatus === 'PAID'
                  ? 'REFUNDED'
                  : order.refundStatus,
              codVerification:
                order.codVerification === 'REQUIRED'
                  ? 'FAILED'
                  : order.codVerification,
              cancellationReason: reason,
              cancelledAt: new Date(),
            },
          });
          await transaction.orderStatusHistory.create({
            data: {
              orderId: id,
              oldStatus: order.status,
              newStatus: 'CANCELLED',
              source: 'ADMIN',
              actorId: actor.userId,
              note: reason,
            },
          });
          await transaction.fulfillmentHistory.create({
            data: {
              orderId: id,
              oldStatus: order.fulfillmentStatus,
              newStatus: 'CANCELLED',
              source: 'ADMIN',
              actorId: actor.userId,
              note: reason,
            },
          });
          await this.audit.record(
            {
              action: 'ORDER_CANCELLED',
              entityType: 'Order',
              entityId: id,
              actor,
              previousValue: {
                status: order.status,
                fulfillmentStatus: order.fulfillmentStatus,
                codVerification: order.codVerification,
              },
              newValue: {
                status: 'CANCELLED',
                fulfillmentStatus: 'CANCELLED',
              },
              metadata: { reason },
            },
            transaction,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('Stock changed while cancelling; retry');
      }
      throw error;
    }
    const order = await this.loadDetailedOrder(id);
    await this.enqueueOrderEvents(order, ['ORDER_CANCELLED']);
    return this.serializeOrder(order);
  }

  async updateFulfillment(
    id: string,
    dto: UpdateFulfillmentDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    await db.$transaction(
      async (transaction) => {
        const order = await transaction.order.findUnique({
          where: { id },
          include: {
            shipment: true,
            items: { include: { reservations: true } },
            fulfillmentExceptions: { where: { status: 'OPEN' } },
          },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== 'CONFIRMED') {
          throw new ConflictException('Only confirmed orders can be fulfilled');
        }
        const nextStatus = nextFulfillmentStatus(order.fulfillmentStatus);
        if (!nextStatus || dto.status !== nextStatus) {
          throw new ConflictException(
            `Fulfillment cannot move from ${order.fulfillmentStatus} to ${dto.status}`,
          );
        }
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
          throw new ConflictException(
            'A complete active reservation is required',
          );
        }
        if (
          dto.status !== 'PICKING' &&
          order.fulfillmentExceptions.length > 0
        ) {
          throw new ConflictException(
            'Resolve all fulfillment exceptions before continuing',
          );
        }
        if (dto.status === 'HANDED_OVER' && !order.shipment) {
          throw new ConflictException(
            'Create the courier shipment before handover',
          );
        }
        const updated = await transaction.order.updateMany({
          where: { id, fulfillmentStatus: order.fulfillmentStatus },
          data: { fulfillmentStatus: dto.status },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Fulfillment changed; refresh and retry');
        }
        await transaction.fulfillmentHistory.create({
          data: {
            orderId: id,
            oldStatus: order.fulfillmentStatus,
            newStatus: dto.status,
            source: 'ADMIN',
            actorId: actor.userId,
            note: dto.note?.normalize('NFKC').trim() || null,
          },
        });
        await this.audit.record(
          {
            action: 'FULFILLMENT_STATUS_CHANGED',
            entityType: 'Order',
            entityId: id,
            actor,
            previousValue: { fulfillmentStatus: order.fulfillmentStatus },
            newValue: { fulfillmentStatus: dto.status },
            metadata: { note: dto.note?.normalize('NFKC').trim() || null },
          },
          transaction,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.getOrder(id);
  }

  async createFulfillmentException(
    id: string,
    dto: CreateFulfillmentExceptionDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id },
      include: { items: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.fulfillmentStatus !== 'PICKING') {
      throw new ConflictException(
        'Exceptions can only be recorded while picking',
      );
    }
    if (
      dto.orderItemId &&
      !order.items.some((item) => item.id === dto.orderItemId)
    ) {
      throw new BadRequestException('Order item does not belong to this order');
    }
    if (dto.type === 'SHORTAGE' && (!dto.orderItemId || !dto.quantity)) {
      throw new BadRequestException(
        'Shortages require an order item and affected quantity',
      );
    }
    await db.$transaction(async (transaction) => {
      const exception = await transaction.fulfillmentException.create({
        data: {
          orderId: id,
          orderItemId: dto.orderItemId,
          type: dto.type,
          quantity: dto.quantity,
          description: dto.description.normalize('NFKC').trim(),
          actorId: actor.userId,
        },
      });
      await this.audit.record(
        {
          action: 'FULFILLMENT_EXCEPTION_CREATED',
          entityType: 'FulfillmentException',
          entityId: exception.id,
          actor,
          newValue: exception,
          metadata: { orderId: id },
        },
        transaction,
      );
    });
    return this.getOrder(id);
  }

  async resolveFulfillmentException(
    id: string,
    exceptionId: string,
    dto: ResolveFulfillmentExceptionDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const exception = await db.fulfillmentException.findFirst({
      where: { id: exceptionId, orderId: id },
    });
    if (!exception)
      throw new NotFoundException('Fulfillment exception not found');
    if (exception.status !== 'OPEN') {
      throw new ConflictException('Fulfillment exception is already resolved');
    }
    await db.$transaction(async (transaction) => {
      const resolved = await transaction.fulfillmentException.update({
        where: { id: exceptionId },
        data: {
          status: 'RESOLVED',
          resolution: dto.resolution.normalize('NFKC').trim(),
          resolvedByActorId: actor.userId,
          resolvedAt: new Date(),
        },
      });
      await this.audit.record(
        {
          action: 'FULFILLMENT_EXCEPTION_RESOLVED',
          entityType: 'FulfillmentException',
          entityId: exceptionId,
          actor,
          previousValue: exception,
          newValue: resolved,
          metadata: { orderId: id },
        },
        transaction,
      );
    });
    return this.getOrder(id);
  }

  async trackOrder(dto: TrackOrderDto) {
    const db = await this.db();
    const reference = dto.reference.normalize('NFKC').trim().toUpperCase();
    const phone = normalizeBangladeshPhone(dto.phone);
    const order = await db.order.findUnique({
      where: { reference },
      include: {
        address: { select: { phoneNormalized: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipment: {
          include: {
            provider: { select: { name: true, code: true } },
            events: {
              where: { ignoredReason: null },
              orderBy: { occurredAt: 'asc' },
            },
          },
        },
      },
    });
    const expectedPhone = order?.address?.phoneNormalized;
    const verified =
      expectedPhone &&
      expectedPhone.length === phone.length &&
      timingSafeEqual(Buffer.from(expectedPhone), Buffer.from(phone));
    if (!order || !verified) {
      throw new NotFoundException('Order details could not be verified');
    }
    const timeline: Array<{
      code: string;
      label: string;
      occurredAt: Date;
    }> = order.statusHistory.map((history) => ({
      code: history.newStatus,
      label: orderStatusLabel(history.newStatus),
      occurredAt: history.createdAt,
    }));
    for (const event of order.shipment?.events ?? []) {
      timeline.push({
        code: event.normalizedStatus,
        label: shipmentStatusLabel(event.normalizedStatus),
        occurredAt: event.occurredAt,
      });
    }
    timeline.sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    );
    return {
      reference: order.reference,
      status: order.status,
      statusLabel: orderStatusLabel(order.status),
      paymentMethod: order.paymentMethod,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      shipment: order.shipment
        ? {
            provider: order.shipment.provider.name,
            status: order.shipment.status,
            statusLabel: shipmentStatusLabel(order.shipment.status),
            trackingNumber: order.shipment.trackingNumber,
            trackingUrl: order.shipment.trackingUrl,
          }
        : null,
      timeline,
    };
  }

  async scheduleStorePickup(
    orderId: string,
    dto: {
      pickupScheduledAt?: string;
      preferredPickupSlot?: string;
      customerPickupNotes?: string;
    },
    actor?: UserPayload,
  ) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { pickupStore: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryMethod !== 'STORE_PICKUP') {
      throw new BadRequestException('Order is not configured for store pickup');
    }

    // Only the owning customer (or an admin caller) may schedule a pickup.
    if (actor?.role !== 'admin') {
      const viewer = actor?.userId
        ? await db.user.findUnique({
            where: { id: actor.userId },
            select: { customerId: true },
          })
        : null;
      if (!viewer?.customerId || viewer.customerId !== order.customerId) {
        throw new NotFoundException('Order not found');
      }
    }

    const scheduledDate = dto.pickupScheduledAt
      ? new Date(dto.pickupScheduledAt)
      : order.pickupScheduledAt;
    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        pickupScheduledAt: scheduledDate,
        preferredPickupSlot:
          dto.preferredPickupSlot ?? order.preferredPickupSlot,
        customerPickupNotes:
          dto.customerPickupNotes ?? order.customerPickupNotes,
        storePickupStatus: 'SCHEDULED_BY_CUSTOMER',
      },
      // Payload-safe response: never echo handover secrets.
      select: {
        id: true,
        reference: true,
        status: true,
        deliveryMethod: true,
        storePickupStatus: true,
        pickupScheduledAt: true,
        preferredPickupSlot: true,
        customerPickupNotes: true,
      },
    });

    if (actor) {
      await this.audit.record({
        action: 'STORE_PICKUP_SCHEDULED',
        entityType: 'Order',
        entityId: orderId,
        actor: { userId: actor.userId, role: actor.role },
        metadata: { scheduledDate, slot: dto.preferredPickupSlot },
      });
    }

    return updated;
  }

  async updateStorePickupStatus(
    orderId: string,
    storePickupStatus:
      | 'AVAILABLE_IN_STORE'
      | 'TRANSFER_REQUIRED'
      | 'IN_TRANSFER'
      | 'READY_FOR_PICKUP'
      | 'CANCELLED',
    actor: UserPayload,
  ) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryMethod !== 'STORE_PICKUP') {
      throw new BadRequestException('Order is not configured for store pickup');
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { storePickupStatus },
    });

    await this.audit.record({
      action: 'STORE_PICKUP_STATUS_UPDATED',
      entityType: 'Order',
      entityId: orderId,
      actor: { userId: actor.userId, role: actor.role },
      metadata: {
        previousStatus: order.storePickupStatus,
        newStatus: storePickupStatus,
      },
    });

    return updated;
  }

  async verifyStoreHandover(orderId: string, otp: string, actor: UserPayload) {
    const db = await this.db();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true, pickupStore: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryMethod !== 'STORE_PICKUP') {
      throw new BadRequestException('Order is not configured for store pickup');
    }
    if (order.storePickupStatus === 'COMPLETED') {
      throw new ConflictException('Order pickup has already been completed.');
    }
    if (
      !order.storePickupOtp ||
      !this.timingSafeEqualStrings(order.storePickupOtp, otp.trim())
    ) {
      throw new BadRequestException(
        'Invalid pickup OTP code. Verification failed.',
      );
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        storePickupStatus: 'COMPLETED',
        fulfillmentStatus: 'FULFILLED',
        status: 'DELIVERED',
        paymentStatus:
          order.paymentMethod === 'PAY_AT_STORE' ||
          order.paymentMethod === 'COD'
            ? 'PAID'
            : order.paymentStatus,
      },
    });

    // Handover is a delivery event: record it in the order history like the
    // courier path does, so completion/return windows and reporting stay
    // consistent.
    await db.orderStatusHistory.create({
      data: {
        orderId,
        oldStatus: order.status,
        newStatus: 'DELIVERED',
        source: 'ADMIN',
        actorId: actor.userId,
        note: `Store pickup handover completed at ${order.pickupStore?.name ?? 'store'}`,
      },
    });
    if (order.fulfillmentStatus !== 'FULFILLED') {
      await db.fulfillmentHistory.create({
        data: {
          orderId,
          oldStatus: order.fulfillmentStatus,
          newStatus: 'FULFILLED',
          source: 'ADMIN',
          actorId: actor.userId,
          note: 'Store pickup handover completed',
        },
      });
    }
    await db.$transaction(async (tx) => {
      await this.consumeDeliveredReservations(tx, orderId);
    });

    await this.audit.record({
      action: 'STORE_PICKUP_HANDOVER_COMPLETED',
      entityType: 'Order',
      entityId: orderId,
      actor: { userId: actor.userId, role: actor.role },
      metadata: {
        storeId: order.pickupStoreId,
        storeName: order.pickupStore?.name,
      },
    });

    return updated;
  }
}
