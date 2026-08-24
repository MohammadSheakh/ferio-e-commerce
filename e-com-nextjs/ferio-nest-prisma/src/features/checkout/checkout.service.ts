import { BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import type { PrismaClient } from '@prisma/client';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { ConfigService } from '@nestjs/config';
import type { UserPayload } from '@app/common';
import { CartService } from '../cart/cart.service';
import { AuditService } from '../audit/audit.service';
import {
  CheckoutPreviewDto,
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from './dto/checkout.dto';
import {
  calculateDeliveryFee,
  normalizeBangladeshPhone,
  normalizeDistrict,
} from './utils/checkout.util';
import { calculateCouponDiscount } from './utils/coupon.util';

const CHECKOUT_DRAFT_LIFETIME_HOURS = 24;

const deliveryZoneInclude = {
  districts: { orderBy: { name: 'asc' as const } },
} satisfies Prisma.DeliveryZoneInclude;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one it explicitly falls back to the legacy DB.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  async getPaymentOptions() {
    const db = await this.db();
    const settings = await db.commerceSettings.upsert({
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
    return {
      methods: {
        cod: settings.codEnabled,
        wallet: true,
        prepaid:
          settings.prepaidEnabled &&
          (this.prepaidProviderConfigured('SSLCOMMERZ') ||
            this.prepaidProviderConfigured('AAMARPAY')),
      },
      providers: [
        {
          code: 'SSLCOMMERZ',
          name: 'SSLCommerz',
          configured: this.prepaidProviderConfigured('SSLCOMMERZ'),
        },
        {
          code: 'AAMARPAY',
          name: 'aamarPay',
          configured: this.prepaidProviderConfigured('AAMARPAY'),
        },
      ],
    };
  }

  private prepaidProviderConfigured(provider: 'SSLCOMMERZ' | 'AAMARPAY') {
    return provider === 'SSLCOMMERZ'
      ? Boolean(
          (this.config.get('SSLCOMMERZ_STORE_ID') ||
            this.config.get('SSL_STORE_ID')) &&
          (this.config.get('SSLCOMMERZ_STORE_PASSWORD') ||
            this.config.get('SSL_STORE_PASSWORD')),
        )
      : Boolean(
          this.config.get('AAMARPAY_STORE_ID') &&
          this.config.get('AAMARPAY_SIGNATURE_KEY'),
        );
  }

  private clean(value?: string): string | undefined {
    const result = value?.normalize('NFKC').trim();
    return result || undefined;
  }

  private districtRows(districts: string[]) {
    const unique = new Map<string, string>();
    for (const district of districts) {
      const name = district.normalize('NFKC').trim().replace(/\s+/g, ' ');
      unique.set(normalizeDistrict(name), name);
    }
    return [...unique].map(([normalizedName, name]) => ({
      name,
      normalizedName,
    }));
  }

  private handleZoneConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A district can only belong to one delivery zone',
      );
    }
    throw error;
  }

  async getDeliveryOptions() {
    const db = await this.db();
    return db.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        deliveryFee: true,
        freeDeliveryThreshold: true,
        districts: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    });
  }

  async getDeliveryZones() {
    const db = await this.db();
    return db.deliveryZone.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: deliveryZoneInclude,
    });
  }

  async createDeliveryZone(dto: CreateDeliveryZoneDto, actor: UserPayload) {
    const db = await this.db();
    try {
      return await db.$transaction(async (transaction) => {
        const zone = await transaction.deliveryZone.create({
          data: {
            name: dto.name.normalize('NFKC').trim(),
            deliveryFee: dto.deliveryFee,
            freeDeliveryThreshold: dto.freeDeliveryThreshold ?? null,
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
            districts: { create: this.districtRows(dto.districts) },
          },
          include: deliveryZoneInclude,
        });
        await this.audit.record(
          {
            action: 'DELIVERY_ZONE_CREATED',
            entityType: 'DeliveryZone',
            entityId: zone.id,
            actor,
            newValue: zone,
          },
          transaction,
        );
        return zone;
      });
    } catch (error) {
      return this.handleZoneConflict(error);
    }
  }

  async updateDeliveryZone(
    id: string,
    dto: UpdateDeliveryZoneDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const existing = await db.deliveryZone.findUnique({
      where: { id },
      include: deliveryZoneInclude,
    });
    if (!existing) throw new NotFoundException('Delivery zone not found');

    try {
      return await db.$transaction(async (transaction) => {
        if (dto.districts) {
          await transaction.deliveryZoneDistrict.deleteMany({
            where: { zoneId: id },
          });
        }
        const updated = await transaction.deliveryZone.update({
          where: { id },
          data: {
            name: dto.name?.normalize('NFKC').trim(),
            deliveryFee: dto.deliveryFee,
            freeDeliveryThreshold: dto.freeDeliveryThreshold,
            isActive: dto.isActive,
            sortOrder: dto.sortOrder,
            districts: dto.districts
              ? { create: this.districtRows(dto.districts) }
              : undefined,
          },
          include: deliveryZoneInclude,
        });
        await this.audit.record(
          {
            action: 'DELIVERY_ZONE_UPDATED',
            entityType: 'DeliveryZone',
            entityId: id,
            actor,
            previousValue: existing,
            newValue: updated,
          },
          transaction,
        );
        return updated;
      });
    } catch (error) {
      return this.handleZoneConflict(error);
    }
  }

  async preview(dto: CheckoutPreviewDto, cartToken?: string) {
    const db = await this.db();
    const commerceSettings = await db.commerceSettings.upsert({
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
    if (dto.paymentMethod === 'COD' && !commerceSettings.codEnabled) {
      throw new ConflictException('Cash on delivery is currently unavailable');
    }
    if (dto.paymentMethod === 'PREPAID') {
      if (!commerceSettings.prepaidEnabled) {
        throw new ConflictException('Prepaid payment is currently unavailable');
      }
      if (
        !dto.paymentProvider ||
        !this.prepaidProviderConfigured(dto.paymentProvider)
      ) {
        throw new ConflictException(
          'The selected payment provider is not configured',
        );
      }
    }
    const cart = await this.cartService.validateCart(cartToken);
    if (!cart.id || cart.items.length === 0) {
      throw new BadRequestException('Add at least one item before checkout');
    }
    if (!cart.isValid) {
      throw new ConflictException('Resolve cart availability issues first');
    }
    if (
      dto.paymentMethod === 'COD' &&
      cart.items.some((item) => !item.codAvailable)
    ) {
      throw new ConflictException(
        'Cash on delivery is unavailable for one or more cart items',
      );
    }

    const deliveryDistrict = await db.deliveryZoneDistrict.findUnique({
      where: { normalizedName: normalizeDistrict(dto.district) },
      include: { zone: true },
    });
    if (!deliveryDistrict?.zone.isActive) {
      throw new BadRequestException(
        'Delivery is not currently available in this district',
      );
    }

    const isStorePickup = dto.deliveryMethod === 'STORE_PICKUP';
    let storePickupStatus:
      | 'NOT_APPLICABLE'
      | 'AVAILABLE_IN_STORE'
      | 'TRANSFER_REQUIRED' = 'NOT_APPLICABLE';
    let pickupStore: any = null;

    if (isStorePickup) {
      if (!dto.pickupStoreId) {
        throw new BadRequestException(
          'Please select a store location for pickup.',
        );
      }
      pickupStore = await db.warehouse.findUnique({
        where: { id: dto.pickupStoreId },
        include: { inventory: true },
      });
      if (!pickupStore || !pickupStore.isStore || !pickupStore.isActive) {
        throw new BadRequestException(
          'Selected store location is not available.',
        );
      }

      // Check if all cart items are available in the selected store
      const allAvailableInStore = cart.items.every((item) => {
        const storeStock = pickupStore.inventory.find(
          (inv) => inv.variantId === item.variantId,
        );
        const availableCount = storeStock
          ? Math.max(0, storeStock.onHand - storeStock.reserved)
          : 0;
        return availableCount >= item.quantity;
      });

      storePickupStatus = allAvailableInStore
        ? 'AVAILABLE_IN_STORE'
        : 'TRANSFER_REQUIRED';
    }

    const phoneNormalized = normalizeBangladeshPhone(dto.phone);
    const deliveryFee = isStorePickup
      ? 0
      : calculateDeliveryFee(
          cart.subtotal,
          deliveryDistrict.zone.deliveryFee,
          deliveryDistrict.zone.freeDeliveryThreshold,
        );
    const coupon = calculateCouponDiscount(
      this.config.get<string>('CHECKOUT_COUPONS_JSON'),
      dto.couponCode,
      cart.subtotal,
    );
    const discountTotal = coupon.discountTotal;
    const paymentCharge = 0;
    const total = cart.subtotal - discountTotal + deliveryFee + paymentCharge;
    const expiresAt = new Date(
      Date.now() + CHECKOUT_DRAFT_LIFETIME_HOURS * 60 * 60 * 1000,
    );
    const marketingConsent = dto.marketingConsent ?? false;
    const purchaseActivityConsent = dto.purchaseActivityConsent ?? false;
    const draftData = {
      name: dto.name.normalize('NFKC').trim(),
      phoneOriginal: dto.phone.trim(),
      phoneNormalized,
      email: this.clean(dto.email),
      district: deliveryDistrict.name,
      area: dto.area.normalize('NFKC').trim(),
      detailedAddress: dto.detailedAddress.normalize('NFKC').trim(),
      landmark: this.clean(dto.landmark),
      latitude: dto.latitude,
      longitude: dto.longitude,
      customerNote: this.clean(dto.customerNote),
      marketingConsent,
      marketingConsentAt: marketingConsent ? new Date() : null,
      purchaseActivityConsent,
      purchaseActivityConsentAt: purchaseActivityConsent ? new Date() : null,
      termsAccepted: dto.termsAccepted,
      source: this.clean(dto.source),
      medium: this.clean(dto.medium),
      campaign: this.clean(dto.campaign),
      deliveryMethod: dto.deliveryMethod || 'HOME_DELIVERY',
      pickupStoreId: isStorePickup ? dto.pickupStoreId : null,
      preferredPickupDate:
        isStorePickup && dto.preferredPickupDate
          ? new Date(dto.preferredPickupDate)
          : null,
      preferredPickupSlot: isStorePickup
        ? this.clean(dto.preferredPickupSlot)
        : null,
      storePickupStatus,
      subtotal: cart.subtotal,
      discountTotal,
      couponCode: coupon.couponCode,
      deliveryFee,
      paymentCharge,
      total,
      paymentMethod: dto.paymentMethod,
      paymentProvider:
        dto.paymentMethod === 'PREPAID' ? dto.paymentProvider : null,
      deliveryZoneId: deliveryDistrict.zoneId,
      expiresAt,
    };
    const draft = await db.checkoutDraft.upsert({
      where: { cartId: cart.id },
      update: draftData,
      create: { ...draftData, cartId: cart.id },
    });

    return {
      draftId: draft.id,
      customer: {
        name: draft.name,
        phone: draft.phoneNormalized,
        email: draft.email,
      },
      address: {
        district: draft.district,
        area: draft.area,
        detailedAddress: draft.detailedAddress,
        landmark: draft.landmark,
      },
      deliveryMethod: draft.deliveryMethod,
      storePickup: isStorePickup
        ? {
            storeId: pickupStore?.id,
            storeName: pickupStore?.name,
            address: pickupStore?.address,
            operatingHours: pickupStore?.operatingHours,
            status: draft.storePickupStatus,
            preferredDate: draft.preferredPickupDate,
            preferredSlot: draft.preferredPickupSlot,
          }
        : null,
      pricing: {
        subtotal: draft.subtotal,
        discountTotal: draft.discountTotal,
        deliveryFee: draft.deliveryFee,
        paymentCharge: draft.paymentCharge,
        total: draft.total,
        couponCode: draft.couponCode,
      },
      paymentMethod: draft.paymentMethod,
      paymentProvider: draft.paymentProvider,
      marketingConsent: draft.marketingConsent,
      purchaseActivityConsent: draft.purchaseActivityConsent,
      customerNote: draft.customerNote,
      expiresAt: draft.expiresAt,
      canPlaceOrder: true,
    };
  }
}
