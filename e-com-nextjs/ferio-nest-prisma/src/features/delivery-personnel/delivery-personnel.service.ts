import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@app/database';
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

@Injectable()
export class DeliveryPersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public Self-Registration for Bangladesh Candidates
   */
  async apply(dto: ApplyDeliveryPersonnelDto) {
    const phoneNorm = normalizePhone(dto.phone);

    const existingPhone = await this.prisma.deliveryPersonnel.findUnique({
      where: { phoneNormalized: phoneNorm },
    });
    if (existingPhone) {
      throw new ConflictException(
        'An application or rider account with this phone number already exists.',
      );
    }

    if (dto.email) {
      const existingEmail = await this.prisma.deliveryPersonnel.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existingEmail) {
        throw new ConflictException(
          'An application or rider account with this email address already exists.',
        );
      }
    }

    return this.prisma.deliveryPersonnel.create({
      data: {
        name: dto.name.trim(),
        phoneOriginal: dto.phone.trim(),
        phoneNormalized: phoneNorm,
        email: dto.email ? dto.email.toLowerCase().trim() : null,
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
    const phoneNorm = normalizePhone(dto.phone);
    const emailNorm = dto.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });

    let userId = existingUser?.id;

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const newUser = await this.prisma.user.create({
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
    } else {
      // Update role to delivery_man, set password, and verify email
      const hashedPassword = await bcrypt.hash(dto.password, 12);
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'delivery_man',
          password: hashedPassword,
          isEmailVerified: true,
        },
      });
    }

    // Check existing delivery personnel profile
    const existingRider = await this.prisma.deliveryPersonnel.findFirst({
      where: {
        OR: [{ phoneNormalized: phoneNorm }, { email: emailNorm }, { userId }],
      },
    });

    if (existingRider) {
      return this.prisma.deliveryPersonnel.update({
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

    return this.prisma.deliveryPersonnel.create({
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
   */
  async updateApproval(id: string, dto: UpdateApprovalDto) {
    const personnel = await this.prisma.deliveryPersonnel.findUnique({
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
        const initialPassword = dto.initialPassword || 'RiderPass123!';
        const hashedPassword = await bcrypt.hash(initialPassword, 12);

        // Check if user exists with this email
        const existingUser = await this.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          userId = existingUser.id;
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'delivery_man',
              password: hashedPassword,
              isEmailVerified: true,
            },
          });
        } else {
          const newUser = await this.prisma.user.create({
            data: {
              name: personnel.name,
              email,
              password: hashedPassword,
              phoneNumber: personnel.phoneNormalized,
              role: 'delivery_man',
              isEmailVerified: true,
            },
          });
          userId = newUser.id;
        }
      }

      return this.prisma.deliveryPersonnel.update({
        where: { id },
        data: {
          status: 'APPROVED',
          notes: dto.notes ? dto.notes.trim() : personnel.notes,
          userId,
        },
      });
    }

    return this.prisma.deliveryPersonnel.update({
      where: { id },
      data: {
        status: dto.status as any,
        notes: dto.notes ? dto.notes.trim() : personnel.notes,
      },
    });
  }

  /**
   * Admin: Full Update Rider Profile & Reset Password
   */
  async updateRiderByAdmin(id: string, dto: UpdateDeliveryPersonnelDto) {
    const personnel = await this.prisma.deliveryPersonnel.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }

    const updateData: any = {};

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
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            name: updateData.name || personnel.name,
            email: email,
            phoneNumber: updateData.phoneNormalized || personnel.phoneNormalized,
          },
        });
      } else {
        const newUser = await this.prisma.user.create({
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
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: updateData.name || personnel.name,
          email: updateData.email || personnel.email || undefined,
          phoneNumber: updateData.phoneNormalized || personnel.phoneNormalized,
        },
      });
    }

    return this.prisma.deliveryPersonnel.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  /**
   * List Delivery Personnel for Admin
   */
  async listAll(query: QueryDeliveryPersonnelDto) {
    const where: any = {};

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
      this.prisma.deliveryPersonnel.findMany({
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
      this.prisma.deliveryPersonnel.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Detail View for Admin
   */
  async findOne(id: string) {
    const personnel = await this.prisma.deliveryPersonnel.findUnique({
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
    const personnel = await this.prisma.deliveryPersonnel.findUnique({
      where: { id: dto.deliveryPersonnelId },
    });
    if (!personnel || personnel.status !== 'APPROVED') {
      throw new BadRequestException(
        'Selected delivery personnel is not active or approved.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.prisma.order.update({
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
    if (!userId) {
      throw new BadRequestException('User ID is missing from authorization token.');
    }
    let personnel = await this.prisma.deliveryPersonnel.findUnique({
      where: { userId },
    });

    if (!personnel) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        personnel = await this.prisma.deliveryPersonnel.findFirst({
          where: {
            OR: [
              { email: { equals: user.email, mode: 'insensitive' } },
              ...(user.phoneNumber ? [{ phoneNormalized: user.phoneNumber }] : []),
            ],
          },
        });
        if (personnel && !personnel.userId) {
          await this.prisma.deliveryPersonnel.update({
            where: { id: personnel.id },
            data: { userId: user.id },
          });
        }
        if (!personnel) {
          return {
            id: user.id,
            name: user.name,
            phoneOriginal: user.phoneNumber || user.email,
            phoneNormalized: user.phoneNumber || '',
            email: user.email,
            vehicleType: 'BIKE',
            operatingZone: 'Dhaka North',
            status: 'APPROVED',
            currentLat: null,
            currentLng: null,
            lastLocationAt: null,
            userId: user.id,
          } as any;
        }
      }
    }

    if (!personnel) {
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
    const personnel = await this.resolveDeliveryPersonnel(userId);
    // If turning online, update lastLocationAt timestamp
    const updateData: any = {};
    if (isOnline) {
      updateData.lastLocationAt = new Date();
    }
    return this.prisma.deliveryPersonnel.update({
      where: { id: personnel.id },
      data: updateData,
    });
  }

  /**
   * Rider Gets Assigned Orders
   */
  async getMyAssignedOrders(userId: string) {
    const personnel = await this.resolveDeliveryPersonnel(userId);

    return this.prisma.order.findMany({
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
   */
  async updateDeliveryOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateDeliveryOrderStatusDto,
  ) {
    const personnel = await this.resolveDeliveryPersonnel(userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, assignedDeliveryPersonnelId: personnel.id },
    });
    if (!order) {
      throw new NotFoundException('Assigned order not found.');
    }

    const shipmentStatusMap: Record<string, any> = {
      PICKED_UP: 'PICKED_UP',
      IN_TRANSIT: 'OUT_FOR_DELIVERY',
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      DELIVERY_FAILED: 'DELIVERY_FAILED',
    };

    const newShipmentStatus = shipmentStatusMap[dto.status] || order.shipmentStatus;
    const newOrderStatus = dto.status === 'DELIVERED' ? 'DELIVERED' : order.status;

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

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        shipmentStatus: newShipmentStatus,
        status: newOrderStatus,
        statusHistory: {
          create: {
            newStatus: newOrderStatus,
            oldStatus: order.status,
            source: 'SYSTEM',
            actorId: userId,
            note: dto.note || `Rider status update: ${dto.status}`,
          },
        },
      },
    });
  }

  /**
   * Rider Pings Location via Browser Geolocation API
   */
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const personnel = await this.resolveDeliveryPersonnel(userId);

    const count = await this.prisma.deliveryLocationHistory.count({
      where: { deliveryPersonnelId: personnel.id },
    });

    const nextSeq = count + 1;

    await this.prisma.deliveryLocationHistory.create({
      data: {
        deliveryPersonnelId: personnel.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        sequence: nextSeq,
      },
    });

    return this.prisma.deliveryPersonnel.update({
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
    const personnel = await this.prisma.deliveryPersonnel.findUnique({
      where: { id },
    });
    if (!personnel) {
      throw new NotFoundException('Delivery personnel record not found.');
    }

    await this.prisma.deliveryLocationHistory.deleteMany({
      where: { deliveryPersonnelId: id },
    });

    return { message: 'Location waypoint history cleared.', currentLat: personnel.currentLat, currentLng: personnel.currentLng };
  }

  /**
   * Admin Map View Data: All Riders with sequence pins & All active orders with lat/lng
   */
  async getDeliveryMapData() {
    const [riders, activeOrders] = await Promise.all([
      this.prisma.deliveryPersonnel.findMany({
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
      this.prisma.order.findMany({
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
