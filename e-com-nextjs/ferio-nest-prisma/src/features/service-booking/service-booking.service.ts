import type { PrismaClient } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { UserPayload } from '@app/common';
import { normalizeBangladeshPhone } from '../checkout/utils/checkout.util';
import {
  CreateBookingDto,
  SaveServiceDto,
  UpdateBookingStatusDto,
} from './service-booking.dto';
@Injectable()
export class ServiceBookingService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy
   * fallback outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  private slug(v: string) {
    return v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  async publicServices() {
    const db = await this.db();
    return db.serviceOffering.findMany({
      where: { status: 'ACTIVE' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }async service(slug: string) {
    const db = await this.db();
    return db.serviceOffering.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: { category: true },
    });
  }async adminServices() {
    const db = await this.db();
    return db.serviceOffering.findMany({
      include: { category: true, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }async save(dto: SaveServiceDto, id?: string) {
    const db = await this.db();
    const data = {
      ...dto,
      slug: dto.slug || this.slug(dto.name),
      leadTimeHours: dto.leadTimeHours ?? 24,
    };
    return id
      ? db.serviceOffering.update({ where: { id }, data })
      : db.serviceOffering.create({ data });
  }async delete(id: string) {
    const db = await this.db();
    return db.serviceOffering.delete({ where: { id } });
  }
  async book(dto: CreateBookingDto) {
    const db = await this.db();
    const service = await db.serviceOffering.findFirst({
      where: { id: dto.serviceId, status: 'ACTIVE' },
    });
    if (!service) throw new NotFoundException('Active service not found');
    const preferredAt = new Date(dto.preferredAt);
    if (preferredAt.getTime() < Date.now() + service.leadTimeHours * 3600000)
      throw new BadRequestException(
        `Book at least ${service.leadTimeHours} hours ahead`,
      );
    return db.serviceBooking.create({
      data: {
        reference: `SVC-${randomBytes(4).toString('hex').toUpperCase()}`,
        serviceId: service.id,
        customerName: dto.customerName.trim(),
        phoneOriginal: dto.phone.trim(),
        phoneNormalized: normalizeBangladeshPhone(dto.phone),
        email: dto.email?.toLowerCase(),
        preferredAt,
        address: dto.address?.trim(),
        customerNote: dto.customerNote?.trim(),
        serviceNameSnapshot: service.name,
        priceSnapshot: service.price,
        durationMinutesSnapshot: service.durationMinutes,
        history: {
          create: {
            newStatus: 'REQUESTED',
            source: 'CUSTOMER',
            note: 'Booking requested',
          },
        },
      },
      include: { history: true },
    });
  }async bookings() {
    const db = await this.db();
    return db.serviceBooking.findMany({
      include: { service: true, history: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async status(id: string, dto: UpdateBookingStatusDto, actor: UserPayload) {
    const db = await this.db();
    const booking = await db.serviceBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const allowed: Record<string, string[]> = {
      REQUESTED: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    };
    if (!allowed[booking.status]?.includes(dto.status))
      throw new ConflictException(
        `Cannot move booking from ${booking.status} to ${dto.status}`,
      );
    const now = new Date();
    return db.$transaction(async (tx) => {
      await tx.serviceBooking.update({
        where: { id },
        data: {
          status: dto.status,
          adminNote: dto.note?.trim(),
          handledById: actor.userId,
          confirmedAt: dto.status === 'CONFIRMED' ? now : undefined,
          completedAt: dto.status === 'COMPLETED' ? now : undefined,
          cancelledAt: ['CANCELLED', 'REJECTED'].includes(dto.status)
            ? now
            : undefined,
        },
      });
      await tx.serviceBookingHistory.create({
        data: {
          bookingId: id,
          oldStatus: booking.status,
          newStatus: dto.status,
          source: 'ADMIN',
          actorId: actor.userId,
          note: dto.note?.trim(),
        },
      });
      return tx.serviceBooking.findUnique({
        where: { id },
        include: { service: true, history: true },
      });
    });
  }
}
