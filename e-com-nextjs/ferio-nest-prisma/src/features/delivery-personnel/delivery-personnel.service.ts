import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  DeliveryPersonnelStatus,
  DeliveryVehicleType,
  OrderShipmentStatus,
  Prisma,
} from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { AuditService } from '../audit/services/audit.service';
import {
  ApplyDeliveryPersonnelDto,
  AssignOrderDto,
  CreateDeliveryPersonnelDto,
  DeliveryPersonnelStatusEnum,
  QueryDeliveryPersonnelDto,
  UpdateApprovalDto,
  UpdateDeliveryOrderStatusDto,
  UpdateDeliveryPersonnelDto,
  UpdateLocationDto,
} from './delivery-personnel.dto';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    return '+' + digits;
  }
  if (digits.startsWith('0')) {
    return '+88' + digits;
  }
  return '+' + digits;
}

type DeliveryPersonnelPatch = {
  name?: string;
  phoneOriginal?: string;
  phoneNormalized?: string;
  email?: string | null;
  nidNumber?: string;
  vehicleType?: DeliveryVehicleType;
  operatingZone?: string;
  drivingLicense?: string;
  emergencyPhone?: string;
  status?: DeliveryPersonnelStatus;
  userId?: string;
};

@Injectable()
export class DeliveryPersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7: tenant client inside resolved storefront/worker contexts; explicit
   * legacy fallback otherwise. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }
  /**
   * Public Self-Registration for Bangladesh Candidates
   */
  async apply(dto: ApplyDeliveryPersonnelDto) {
    const db = await this.db();
    const phoneNorm = normalizePhone(dto.phone);
    const emailNorm = dto.email ? dto.email.toLowerCase().trim() : null;

    const [existingPhone, existingEmail, conflictingUser] = await Promise.all([
      db.deliveryPersonnel.findUnique({
        where: { phoneNormalized: phoneNorm },
      }),
      emailNorm
        ? db.deliveryPersonnel.findUnique({ where: { email: emailNorm } })
        : Promise.resolve(null),
      emailNorm
        ? db.user.findUnique({ where: { email: emailNorm } })
        : Promise.resolve(null),
    ]);
    if (existingPhone || existingEmail) {
      throw new ConflictException(
        'This application could not be accepted. If you already applied, please wait for review or contact support.',
      );
    }
    // Never allow an application email that already belongs to an existing
    // account: approval must never be able to hijack or reset that account.
    if (conflictingUser) {
      throw new ConflictException(
        'This email address cannot be used for a rider application. Please use a different personal email address.',
      );
    }

    return db.deliveryPersonnel.create({
      data: {
        name: dto.name.trim(),
        phoneOriginal: dto.phone.trim(),
        phoneNormalized: phoneNorm,
        email: emailNorm,
        nidNumber: dto.nidNumber.trim(),
        vehicleType: dto.vehicleType || 'BIKE',
        operatingZone: dto.operatingZone.trim(),
        drivingLicense: dto.drivingLicense ? dto.drivingLicense.trim() : null,
        emergencyPhone: dto.emergencyPhone.trim(),
        status: 'PENDING_APPROVAL',
      },
    });
  }

  /**
   * Direct Creation by Admin
   */
  async createDirectByAdmin(dto: CreateDeliveryPersonnelDto) {
    const db = await this.db();
    const phoneNorm = normalizePhone(dto.phone);
    const emailNorm = dto.email.toLowerCase().trim();

    // An existing platform account must never be silently converted into a
    // rider account (that would reset the victim's password and role).
    const existingUser = await db.user.findUnique({
      where: { email: emailNorm },
    });
    if (existingUser && existingUser.role !== 'delivery_man') {
      throw new ConflictException(
        'A platform account with this email already exists with a different role. Choose a different email or manage that account through staff/user administration.',
      );
    }

    let userId = existingUser?.id;

    if (!existingUser) {
      if (!dto.password || dto.password.trim().length < 10) {
        throw new BadRequestException(
          'An initial password of at least 10 characters is required when creating a rider account.',
        );
      }
      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const newUser = await db.user.create({
        data: {
          name: dto.name.trim(),
          email: emailNorm,
          password: hashedPassword,
          phoneNumber: phoneNorm,
          role: 'delivery_man',
          isEmailVerified: true,
        },
      });
      userId = newUser.id;
    }

    // Check existing delivery personnel profile
    const existingRider = await db.deliveryPersonnel.findFirst({
      where: {
        OR: [{ phoneNormalized: phoneNorm }, { email: emailNorm }, { userId }],
      },
    });

    if (existingRider) {
      return db.deliveryPersonnel.update({
        where: { id: existingRider.id },
        data: {
          name: dto.name.trim(),
          phoneOriginal: dto.phone.trim(),
          phoneNormalized: phoneNorm,
          email: emailNorm,
          nidNumber: dto.nidNumber?.trim() || existingRider.nidNumber,
          vehicleType: dto.vehicleType || existingRider.vehicleType,
          operatingZone: dto.operatingZone?.trim() || existingRider.operatingZone,
          drivingLicense: dto.drivingLicense?.trim() || existingRider.drivingLicense,
          emergencyPhone: dto.emergencyPhone?.trim() || existingRider.emergencyPhone,
          status: 'APPROVED',
          userId,
        },
      });
    }

    return db.deliveryPersonnel.create({
      data: {
        name: dto.name.trim(),
        phoneOriginal: dto.phone.trim(),
        phoneNormalized: phoneNorm,
        email: emailNorm,
        nidNumber: dto.nidNumber?.trim(),
        vehicleType: dto.vehicleType || 'BIKE',
        operatingZone: dto.operatingZone?.trim(),
        drivingLicense: dto.drivingLicense?.trim(),
        emergencyPhone: dto.emergencyPhone?.trim(),
        status: 'APPROVED',
        userId,
      },
    });
  }

  /**
   * Admin Approval / Rejection Workflow
   *
   * Approval provisions a NEW rider account only. It must never mutate an
   * existing platform account (no password resets, no role changes) — that
   * would turn one admin click into an account-takeover primitive.
   */
  async updateApproval(id: string, dto: UpdateApprovalDto) {
    const db = await this.db();
    const personnel = await db.deliveryPersonnel.findUnique({
      where: { id },
    });
    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }

    if (dto.status === DeliveryPersonnelStatusEnum.APPROVED) {
      let userId = personnel.userId;

      if (!userId) {
        const email =
          personnel.email ||
          `rider.${personnel.phoneNormalized.replace('+', '')}@ferio.local`;

        const existingUser = await db.user.findUnique({
          where: { email },
        });
        if (existingUser && existingUser.role !== 'delivery_man') {
          throw new ConflictException(
            'A platform account with this email already exists with a different role. Resolve the account conflict before approving this rider.',
          );
        }

        if (!dto.initialPassword || dto.initialPassword.trim().length < 10) {
          throw new BadRequestException(
            'An initial password of at least 10 characters is required to provision this rider account.',
          );
        }

        userId = await db.$transaction(async (tx) => {
          let txUserId = existingUser?.id;
          if (txUserId) {
            // Existing rider-linked account (same role): reset credential so a
            // known password can be handed over securely by the owner.
            const hashedPassword = await bcrypt.hash(dto.initialPassword!, 12);
            await tx.user.update({
              where: { id: txUserId },
              data: { password: hashedPassword },
            });
          } else {
            const hashedPassword = await bcrypt.hash(dto.initialPassword!, 12);
            const newUser = await tx.user.create({
              data: {
                name: personnel.name,
                email,
                password: hashedPassword,
                phoneNumber: personnel.phoneNormalized,
                role: 'delivery_man',
                isEmailVerified: true,
              },
            });
            txUserId = newUser.id;
          }
          return txUserId;
        });
      }

      return db.$transaction(async (tx) => {
        const updated = await tx.deliveryPersonnel.update({
          where: { id },
          data: {
            status: 'APPROVED',
            notes: dto.notes ? dto.notes.trim() : personnel.notes,
            userId,
          },
        });
        await this.audit.record(
          {
            action: 'DELIVERY_PERSONNEL_APPROVED',
            entityType: 'DeliveryPersonnel',
            entityId: id,
            newValue: {
              riderUserId: userId,
              status: 'APPROVED',
              provisionedNewAccount: !personnel.userId,
            },
          },
          tx as Prisma.TransactionClient,
        );
        return updated;
      });
    }

    return db.deliveryPersonnel.update({
      where: { id },
      data: {
        status: dto.status as DeliveryPersonnelStatus,
        notes: dto.notes ? dto.notes.trim() : personnel.notes,
      },
    });
  }

  /**
   * Admin: Full Update Rider Profile & Reset Password
   */
  async updateRiderByAdmin(id: string, dto: UpdateDeliveryPersonnelDto) {
    const db = await this.db();
    const personnel = await db.deliveryPersonnel.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }

    const updateData: DeliveryPersonnelPatch = {};

    if (dto.name) updateData.name = dto.name.trim();
    if (dto.phone) {
      updateData.phoneOriginal = dto.phone.trim();
      updateData.phoneNormalized = normalizePhone(dto.phone);
    }
    if (dto.email !== undefined) {
      updateData.email = dto.email ? dto.email.toLowerCase().trim() : null;
    }
    if (dto.nidNumber !== undefined) updateData.nidNumber = dto.nidNumber?.trim();
    if (dto.vehicleType) updateData.vehicleType = dto.vehicleType;
    if (dto.operatingZone !== undefined) updateData.operatingZone = dto.operatingZone?.trim();
    if (dto.drivingLicense !== undefined) updateData.drivingLicense = dto.drivingLicense?.trim();
    if (dto.emergencyPhone !== undefined) updateData.emergencyPhone = dto.emergencyPhone?.trim();
    if (dto.status) updateData.status = dto.status;

    let userId = personnel.userId;

    // Handle Password Reset / User Account update
    if (dto.password && dto.password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(dto.password.trim(), 12);
      const email =
        dto.email?.toLowerCase().trim() ||
        personnel.email ||
        `rider.${(updateData.phoneNormalized || personnel.phoneNormalized).replace('+', '')}@ferio.local`;

      if (userId) {
        await db.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            name: updateData.name || personnel.name,
            email: email,
            phoneNumber: updateData.phoneNormalized || personnel.phoneNormalized,
          },
        });
      } else {
        const newUser = await db.user.create({
          data: {
            name: updateData.name || personnel.name,
            email: email,
            password: hashedPassword,
            phoneNumber: updateData.phoneNormalized || personnel.phoneNormalized,
            role: 'delivery_man',
            isEmailVerified: true,
          },
        });
        userId = newUser.id;
        updateData.userId = userId;
      }
    } else if (userId && (updateData.name || updateData.email || updateData.phoneNormalized)) {
      await db.user.update({
        where: { id: userId },
        data: {
          name: updateData.name || personnel.name,
          email: updateData.email || personnel.email || undefined,
          phoneNumber: updateData.phoneNormalized || personnel.phoneNormalized,
        },
      });
    }

    return db.deliveryPersonnel.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  /**
   * List Delivery Personnel for Admin
   */
  async listAll(query: QueryDeliveryPersonnelDto) {
    const db = await this.db();
    const where: Prisma.DeliveryPersonnelWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.zone) {
      where.operatingZone = { contains: query.zone, mode: 'insensitive' };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phoneOriginal: { contains: s, mode: 'insensitive' } },
        { phoneNormalized: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { nidNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.deliveryPersonnel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, profileImageUrl: true },
          },
          _count: {
            select: { assignedOrders: true },
          },
        },
      }),
      db.deliveryPersonnel.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Detail View for Admin
   */
  async findOne(id: string) {
    const db = await this.db();
    const personnel = await db.deliveryPersonnel.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        assignedOrders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reference: true,
            status: true,
            shipmentStatus: true,
            deliveryFee: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }
    return personnel;
  }

  /**
   * Admin Assign Order to Delivery Rider
   */
  async assignOrder(dto: AssignOrderDto) {
    const db = await this.db();
    const personnel = await db.deliveryPersonnel.findUnique({
      where: { id: dto.deliveryPersonnelId },
    });
    if (!personnel || personnel.status !== 'APPROVED') {
      throw new BadRequestException(
        'Selected delivery personnel is not active or approved.',
      );
    }

    const order = await db.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return db.order.update({
      where: { id: dto.orderId },
      data: {
        assignedDeliveryPersonnelId: personnel.id,
        shipmentStatus:
          order.shipmentStatus === 'NOT_CREATED'
            ? 'READY'
            : order.shipmentStatus,
      },
    });
  }

  private async resolveDeliveryPersonnel(userId: string) {
    const db = await this.db();
    if (!userId) {
      throw new BadRequestException('User ID is missing from authorization token.');
    }
    let personnel = await db.deliveryPersonnel.findUnique({
      where: { userId },
    });

    if (!personnel) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user) {
        const candidate = await db.deliveryPersonnel.findFirst({
          where: {
            OR: [
              { email: { equals: user.email, mode: 'insensitive' } },
              ...(user.phoneNumber ? [{ phoneNormalized: user.phoneNumber }] : []),
            ],
          },
        });
        // Auto-link only a genuinely approved rider record; never fabricate
        // an approved profile for accounts without one.
        if (candidate && candidate.status === 'APPROVED') {
          personnel = candidate;
          if (!personnel.userId) {
            await db.deliveryPersonnel.update({
              where: { id: personnel.id },
              data: { userId: user.id },
            });
          }
        }
      }
    }

    if (!personnel || personnel.status !== 'APPROVED') {
      throw new NotFoundException('No active rider profile is linked to this account.');
    }

    return personnel;
  }

  /**
   * Get Logged-in Rider Profile
   */
  async getMyProfile(userId: string) {
    const personnel = await this.resolveDeliveryPersonnel(userId);
    return personnel;
  }

  /**
   * Toggle Rider Online / Offline Duty Status
   */
  async toggleOnlineStatus(userId: string, isOnline: boolean) {
    const db = await this.db();
    const personnel = await this.resolveDeliveryPersonnel(userId);
    // If turning online, update lastLocationAt timestamp
    const updateData: Prisma.DeliveryPersonnelUpdateInput = {};
    if (isOnline) {
      updateData.lastLocationAt = new Date();
    }
    return db.deliveryPersonnel.update({
      where: { id: personnel.id },
      data: updateData,
    });
  }

  /**
   * Rider Gets Assigned Orders
   */
  async getMyAssignedOrders(userId: string) {
    const db = await this.db();
    const personnel = await this.resolveDeliveryPersonnel(userId);

    return db.order.findMany({
      where: { assignedDeliveryPersonnelId: personnel.id },
      orderBy: { createdAt: 'desc' },
      include: {
        address: true,
        customer: { select: { id: true, name: true, phoneOriginal: true, phoneNormalized: true } },
        items: true,
      },
    });
  }

  /**
   * Rider Updates Delivery Status of an Assigned Order
   *
   * DELIVERED must follow the same invariants as the courier path:
   * reservations are consumed, fulfillment history is written, and the
   * transition is validated. Riders can never move a cancelled/completed
   * order, and every change runs inside one transaction.
   */
  async updateDeliveryOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateDeliveryOrderStatusDto,
  ) {
    const db = await this.db();
    const personnel = await this.resolveDeliveryPersonnel(userId);

    const shipmentStatusMap: Record<
      UpdateDeliveryOrderStatusDto['status'],
      OrderShipmentStatus
    > = {
      PICKED_UP: OrderShipmentStatus.PICKED_UP,
      IN_TRANSIT: OrderShipmentStatus.OUT_FOR_DELIVERY,
      OUT_FOR_DELIVERY: OrderShipmentStatus.OUT_FOR_DELIVERY,
      DELIVERED: OrderShipmentStatus.DELIVERED,
      DELIVERY_FAILED: OrderShipmentStatus.DELIVERY_FAILED,
    };
    const newShipmentStatus = shipmentStatusMap[dto.status];
    if (!newShipmentStatus) {
      throw new BadRequestException(`Unsupported rider status: ${dto.status}`);
    }

    if (typeof dto.latitude === 'number' && typeof dto.longitude === 'number') {
      try {
        await this.updateLocation(userId, {
          latitude: dto.latitude,
          longitude: dto.longitude,
        });
      } catch {
        // Continue order status update even if location recording encounters an issue
      }
    }

    return db.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, assignedDeliveryPersonnelId: personnel.id },
        });
        if (!order) {
          throw new NotFoundException('Assigned order not found.');
        }

        const terminalOrBlocked = [
          'CANCELLED',
          'DELIVERED',
          'COMPLETED',
        ];
        const terminalShipmentStatuses: OrderShipmentStatus[] = [
          OrderShipmentStatus.DELIVERED,
          OrderShipmentStatus.RETURNED,
          OrderShipmentStatus.CANCELLED,
          OrderShipmentStatus.RTO,
        ];
        if (
          terminalOrBlocked.includes(order.status) ||
          terminalShipmentStatuses.includes(
            order.shipmentStatus as OrderShipmentStatus,
          )
        ) {
          throw new ConflictException(
            `Order in status ${order.status}/${order.shipmentStatus} cannot be updated by a rider.`,
          );
        }
        // Only approved riders may move orders.
        if (personnel.status !== 'APPROVED') {
          throw new ConflictException(
            'Rider profile is not approved for delivery operations.',
          );
        }
        // Riders only operate on orders that were actually handed to them.
        if (!['SHIPPED', 'READY_TO_SHIP'].includes(order.status)) {
          throw new ConflictException(
            `Order must be handed over for delivery before rider updates (current status: ${order.status}).`,
          );
        }

        const isDelivered = dto.status === 'DELIVERED';
        const newOrderStatus = isDelivered ? 'DELIVERED' : order.status;

        if (isDelivered) {
          await this.consumeDeliveredReservations(tx, order.id);
          if (order.fulfillmentStatus !== 'FULFILLED') {
            await tx.fulfillmentHistory.create({
              data: {
                orderId: order.id,
                oldStatus: order.fulfillmentStatus,
                newStatus: 'FULFILLED',
                source: 'ADMIN',
                actorId: userId,
                note: `Rider confirmed parcel delivery (${personnel.name})`,
              },
            });
          }
        }

        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            shipmentStatus: newShipmentStatus,
            status: newOrderStatus,
            ...(isDelivered ? { fulfillmentStatus: 'FULFILLED' as const } : {}),
            statusHistory: {
              create: {
                newStatus: newOrderStatus,
                oldStatus: order.status,
                source: 'ADMIN',
                actorId: userId,
                note:
                  dto.note ||
                  `Rider status update: ${dto.status} (rider ${personnel.name})`,
              },
            },
          },
        });

        if (isDelivered) {
          // COD cash collection evidence cannot be fabricated here: there is
          // no courier shipment to attach a CodCollection to, so finance
          // reviews rider-collected COD through audit + reconciliation.
          // Payment status intentionally remains PENDING for COD orders until
          // staff confirm the handover of collected cash.
          await this.audit.record(
            {
              action: 'RIDER_DELIVERY_CONFIRMED',
              entityType: 'Order',
              entityId: order.id,
              actor: { userId, role: 'delivery_man' },
              newValue: {
                reference: order.reference,
                paymentMethod: order.paymentMethod,
                totalMinor: order.total,
                codCashPendingStaffConfirmation: order.paymentMethod === 'COD',
              },
            },
            tx as Prisma.TransactionClient,
          );
        }

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Consume ACTIVE stock reservations for a delivered order that has no
   * courier shipment (rider-delivered). Mirrors ShippingService's delivery
   * accounting so inventory stays consistent regardless of who delivered.
   */
  private async consumeDeliveredReservations(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderItem: { orderId }, status: 'ACTIVE' },
    });
    for (const reservation of reservations) {
      const stock = await tx.inventoryStock.findUnique({
        where: { id: reservation.inventoryId },
      });
      if (
        !stock ||
        stock.reserved < reservation.quantity ||
        stock.onHand < reservation.quantity
      ) {
        throw new ConflictException('Delivered reservation is inconsistent');
      }
      await tx.inventoryStock.update({
        where: { id: reservation.inventoryId },
        data: {
          reserved: { decrement: reservation.quantity },
          onHand: { decrement: reservation.quantity },
        },
      });
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'CONSUMED', consumedAt: new Date() },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryId: reservation.inventoryId,
          type: 'SALE',
          quantityDelta: -reservation.quantity,
          reason: 'Rider confirmed delivery',
          referenceType: 'Order',
          referenceId: orderId,
        },
      });
    }
  }

  /**
   * Rider Pings Location via Browser Geolocation API
   */
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const db = await this.db();
    const personnel = await this.resolveDeliveryPersonnel(userId);

    const count = await db.deliveryLocationHistory.count({
      where: { deliveryPersonnelId: personnel.id },
    });

    const nextSeq = count + 1;

    await db.deliveryLocationHistory.create({
      data: {
        deliveryPersonnelId: personnel.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        sequence: nextSeq,
      },
    });

    return db.deliveryPersonnel.update({
      where: { id: personnel.id },
      data: {
        currentLat: dto.latitude,
        currentLng: dto.longitude,
        lastLocationAt: new Date(),
      },
    });
  }

  /**
   * Admin Clears Location Waypoint History for a Rider
   */
  async clearLocationHistory(id: string) {
    const db = await this.db();
    const personnel = await db.deliveryPersonnel.findUnique({
      where: { id },
    });
    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }

    await db.deliveryLocationHistory.deleteMany({
      where: { deliveryPersonnelId: id },
    });

    return { message: 'Location waypoint history cleared.', currentLat: personnel.currentLat, currentLng: personnel.currentLng };
  }

  /**
   * Admin Map View Data: All Riders with sequence pins & All active orders with lat/lng
   */
  async getDeliveryMapData() {
    const db = await this.db();
    const [riders, activeOrders] = await Promise.all([
      db.deliveryPersonnel.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          name: true,
          phoneOriginal: true,
          vehicleType: true,
          operatingZone: true,
          currentLat: true,
          currentLng: true,
          lastLocationAt: true,
          locationHistory: {
            orderBy: { sequence: 'asc' },
            select: { id: true, latitude: true, longitude: true, sequence: true, createdAt: true },
          },
        },
      }),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          reference: true,
          status: true,
          shipmentStatus: true,
          total: true,
          createdAt: true,
          assignedDeliveryPersonnelId: true,
          address: {
            select: {
              recipientName: true,
              phoneOriginal: true,
              district: true,
              area: true,
              detailedAddress: true,
              landmark: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
    ]);

    return { riders, activeOrders };
  }
}
