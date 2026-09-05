import {
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
import { timingSafeEqual } from 'crypto';
import { normalizeBangladeshPhone } from '../checkout/utils/checkout.util';
import {
  CreateCustomerAddressDto,
  LinkCustomerAccountDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from './customer-account.dto';

@Injectable()
export class CustomerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy fallback
   * outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }
  async link(dto: LinkCustomerAccountDto, actor: UserPayload) {
    const db = await this.db();
    const reference = dto.reference.normalize('NFKC').trim().toUpperCase();
    const phone = normalizeBangladeshPhone(dto.phone);
    const order = await db.order.findUnique({
      where: { reference },
      select: {
        customerId: true,
        address: { select: { phoneNormalized: true } },
      },
    });
    const expected = order?.address?.phoneNormalized;
    const valid =
      expected &&
      expected.length === phone.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(phone));
    if (!order || !valid) {
      throw new NotFoundException('Order could not be verified');
    }
    const user = await db.user.findUnique({
      where: { id: actor.userId },
      select: { customerId: true },
    });
    if (!user) throw new NotFoundException('Account not found');
    if (user.customerId && user.customerId !== order.customerId) {
      throw new ConflictException(
        'This account is already linked to another customer profile',
      );
    }
    const existingLink = await db.user.findFirst({
      where: { customerId: order.customerId, id: { not: actor.userId } },
      select: { id: true },
    });
    if (existingLink) {
      throw new ConflictException(
        'This customer profile is already linked to another account',
      );
    }
    await db.user.update({
      where: { id: actor.userId },
      data: { customerId: order.customerId },
    });
    return this.profile(actor);
  }

  async updateProfile(dto: UpdateCustomerProfileDto, actor: UserPayload) {
    const db = await this.db();
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phoneNumber !== undefined)
      data.phoneNumber = dto.phoneNumber.trim();
    if (dto.profileImageUrl !== undefined)
      data.profileImageUrl = dto.profileImageUrl.trim();

    const user = await db.user.update({
      where: { id: actor.userId },
      data,
      select: { customerId: true, email: true },
    });

    const customerData: Prisma.CustomerUpdateInput = {};
    if (dto.name !== undefined) customerData.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) {
      const cleanPhone = dto.phoneNumber.trim();
      customerData.phoneOriginal = cleanPhone;
      try {
        customerData.phoneNormalized = normalizeBangladeshPhone(cleanPhone);
      } catch {
        customerData.phoneNormalized = cleanPhone;
      }
    }

    if (Object.keys(customerData).length > 0) {
      if (user.customerId) {
        await db.customer.update({
          where: { id: user.customerId },
          data: customerData,
        });
      } else if (user.email) {
        await db.customer.updateMany({
          where: { email: user.email },
          data: customerData,
        });
      }
    }

    return this.profile(actor);
  }

  async profile(actor: UserPayload) {
    const db = await this.db();
    const user = await db.user.findUnique({
      where: { id: actor.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        profileImageUrl: true,
        isEmailVerified: true,
        customer: {
          select: {
            id: true,
            name: true,
            phoneNormalized: true,
            email: true,
            addresses: {
              orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
              select: {
                id: true,
                label: true,
                recipientName: true,
                phoneOriginal: true,
                district: true,
                area: true,
                detailedAddress: true,
                landmark: true,
                latitude: true,
                longitude: true,
                isDefault: true,
              },
            },
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 50,
              select: {
                id: true,
                reference: true,
                status: true,
                paymentStatus: true,
                fulfillmentStatus: true,
                shipmentStatus: true,
                returnStatus: true,
                refundStatus: true,
                paymentMethod: true,
                total: true,
                createdAt: true,
                address: { select: { district: true, area: true } },
                items: {
                  select: {
                    id: true,
                    productName: true,
                    variantName: true,
                    imageUrl: true,
                    quantity: true,
                    lineTotal: true,
                  },
                },
                shipment: {
                  select: {
                    trackingNumber: true,
                    provider: { select: { name: true } },
                  },
                },
              },
            },
            _count: { select: { orders: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Account not found');
    return {
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImageUrl: user.profileImageUrl,
        isEmailVerified: user.isEmailVerified,
      },
      linked: Boolean(user.customer),
      customer: user.customer,
      orderHistoryLimit: 50,
      orderHistoryTruncated: (user.customer?._count.orders ?? 0) > 50,
    };
  }

  async ensureCustomerForUser(userId: string) {
    const db = await this.db();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { customerId: true, name: true, email: true, phoneNumber: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.customerId) return user.customerId;

    const phone = user.phoneNumber || '01700000000';
    let phoneNormalized = phone;
    try {
      phoneNormalized = normalizeBangladeshPhone(phone);
    } catch {}

    const existing = await db.customer.findFirst({
      where: {
        OR: [
          ...(user.email ? [{ email: user.email }] : []),
          { phoneNormalized },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const customerId = existing
      ? existing.id
      : (
          await db.customer.create({
            data: {
              name: user.name || 'Customer',
              phoneOriginal: phone,
              phoneNormalized,
              email: user.email,
            },
          })
        ).id;

    await db.user.update({
      where: { id: userId },
      data: { customerId },
    });

    return customerId;
  }

  async addAddress(dto: CreateCustomerAddressDto, actor: UserPayload) {
    const db = await this.db();
    const customerId = await this.ensureCustomerForUser(actor.userId);
    const existingCount = await db.customerAddress.count({
      where: { customerId },
    });

    const isDefault = dto.isDefault || existingCount === 0;

    if (isDefault) {
      await db.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    let phoneNormalized = dto.phone ? dto.phone.trim() : '01700000000';
    try {
      phoneNormalized = normalizeBangladeshPhone(dto.phone);
    } catch {}

    await db.customerAddress.create({
      data: {
        label: dto.label?.trim() || 'Home',
        recipientName: dto.recipientName.trim(),
        phoneOriginal: dto.phone.trim(),
        phoneNormalized,
        district: dto.district.trim(),
        area: dto.area.trim(),
        detailedAddress: dto.detailedAddress.trim(),
        landmark: dto.landmark?.trim() || null,
        latitude:
          dto.latitude !== undefined && dto.latitude !== null
            ? Number(dto.latitude)
            : null,
        longitude:
          dto.longitude !== undefined && dto.longitude !== null
            ? Number(dto.longitude)
            : null,
        isDefault,
        customerId,
      },
    });

    return this.profile(actor);
  }

  async updateAddress(
    addressId: string,
    dto: UpdateCustomerAddressDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const customerId = await this.ensureCustomerForUser(actor.userId);
    const address = await db.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await db.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    let phoneNormalized = dto.phone ? dto.phone.trim() : undefined;
    if (dto.phone) {
      try {
        phoneNormalized = normalizeBangladeshPhone(dto.phone);
      } catch {
        phoneNormalized = dto.phone.trim();
      }
    }

    await db.customerAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.recipientName !== undefined
          ? { recipientName: dto.recipientName.trim() }
          : {}),
        ...(dto.phone !== undefined
          ? { phoneOriginal: dto.phone.trim(), phoneNormalized }
          : {}),
        ...(dto.district !== undefined
          ? { district: dto.district.trim() }
          : {}),
        ...(dto.area !== undefined ? { area: dto.area.trim() } : {}),
        ...(dto.detailedAddress !== undefined
          ? { detailedAddress: dto.detailedAddress.trim() }
          : {}),
        ...(dto.landmark !== undefined
          ? { landmark: dto.landmark?.trim() || null }
          : {}),
        ...(dto.latitude !== undefined
          ? { latitude: dto.latitude !== null ? Number(dto.latitude) : null }
          : {}),
        ...(dto.longitude !== undefined
          ? { longitude: dto.longitude !== null ? Number(dto.longitude) : null }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    return this.profile(actor);
  }

  async deleteAddress(addressId: string, actor: UserPayload) {
    const db = await this.db();
    const customerId = await this.ensureCustomerForUser(actor.userId);
    const address = await db.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    await db.customerAddress.delete({
      where: { id: addressId },
    });

    if (address.isDefault) {
      const remaining = await db.customerAddress.findFirst({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
      });
      if (remaining) {
        await db.customerAddress.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return this.profile(actor);
  }
}
