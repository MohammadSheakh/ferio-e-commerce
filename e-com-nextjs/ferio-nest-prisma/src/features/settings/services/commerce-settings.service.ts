import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { AuditService } from '../../audit/services/audit.service';
import { normalizeBangladeshPhone } from '../../checkout/utils/checkout.util';
import { UpdateCommerceSettingsDto } from '../dto/commerce-settings.dto';

const defaultCommerceSettings = {
  id: 'default',
  storeName: 'Ferio',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  orderPrefix: 'FER',
} satisfies Prisma.CommerceSettingsCreateInput;

@Injectable()
export class CommerceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /** Tenant client inside resolved storefront requests; legacy otherwise. */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  async get() {
    const db = await this.db();
    return db.commerceSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: defaultCommerceSettings,
    });
  }

  async getPublic() {
    const settings = await this.get();
    return {
      storeName: settings.storeName,
      legalName: settings.legalName,
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
      currency: settings.currency,
      timezone: settings.timezone,
      defaultReturnWindowDays: settings.defaultReturnWindowDays,
      codEnabled: settings.codEnabled,
      prepaidEnabled: settings.prepaidEnabled,
      serviceBookingEnabled: settings.serviceBookingEnabled,
      warrantyClaimsEnabled: settings.warrantyClaimsEnabled,
      storefrontAnalyticsEnabled: settings.storefrontAnalyticsEnabled,
      purchaseActivityEnabled: settings.purchaseActivityEnabled,
      purchaseHistoryEnabled: settings.purchaseHistoryEnabled,
      categoryTopNavEnabled: settings.categoryTopNavEnabled ?? true,
      categorySideNavEnabled: settings.categorySideNavEnabled ?? true,
      termsUrl: settings.termsUrl,
      privacyUrl: settings.privacyUrl,
      returnPolicyUrl: settings.returnPolicyUrl,
    };
  }

  async update(dto: UpdateCommerceSettingsDto, actor: UserPayload) {
    if (dto.prepaidEnabled && !this.hasConfiguredPaymentProvider()) {
      throw new ConflictException(
        'Configure SSLCommerz or aamarPay credentials before enabling prepaid checkout',
      );
    }
    if (dto.timezone) this.assertTimezone(dto.timezone);

    const data: Prisma.CommerceSettingsUpdateInput = {
      storeName: this.clean(dto.storeName),
      legalName: this.cleanNullable(dto.legalName),
      supportPhone: this.normalizePhone(dto.supportPhone),
      supportEmail: this.cleanNullable(dto.supportEmail)?.toLowerCase(),
      currency: dto.currency,
      timezone: this.clean(dto.timezone),
      orderPrefix: this.clean(dto.orderPrefix)?.toUpperCase(),
      defaultReturnWindowDays: dto.defaultReturnWindowDays,
      codEnabled: dto.codEnabled,
      prepaidEnabled: dto.prepaidEnabled,
      serviceBookingEnabled: dto.serviceBookingEnabled,
      warrantyClaimsEnabled: dto.warrantyClaimsEnabled,
      storefrontAnalyticsEnabled: dto.storefrontAnalyticsEnabled,
      purchaseActivityEnabled: dto.purchaseActivityEnabled,
      purchaseHistoryEnabled: dto.purchaseHistoryEnabled,
      categoryTopNavEnabled: dto.categoryTopNavEnabled,
      categorySideNavEnabled: dto.categorySideNavEnabled,
      purchaseActivityShowDistrict: dto.purchaseActivityShowDistrict,
      purchaseActivityShowArea: dto.purchaseActivityShowArea,
      purchaseActivityDurationMs: dto.purchaseActivityDurationMs,
      purchaseActivityIntervalSeconds: dto.purchaseActivityIntervalSeconds,
      purchaseActivityMaxAgeDays: dto.purchaseActivityMaxAgeDays,
      purchaseActivityExcludedProductIds:
        dto.purchaseActivityExcludedProductIds === undefined
          ? undefined
          : [
              ...new Set(
                dto.purchaseActivityExcludedProductIds
                  .map((id) => id.trim())
                  .filter(Boolean),
              ),
            ],
      termsUrl: this.cleanNullable(dto.termsUrl),
      privacyUrl: this.cleanNullable(dto.privacyUrl),
      returnPolicyUrl: this.cleanNullable(dto.returnPolicyUrl),
    };

    const db = await this.db();
    return db.$transaction(async (transaction) => {
      const previous = await transaction.commerceSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: defaultCommerceSettings,
      });
      const updated = await transaction.commerceSettings.update({
        where: { id: 'default' },
        data,
      });
      await this.audit.record(
        {
          action: 'COMMERCE_SETTINGS_UPDATED',
          entityType: 'CommerceSettings',
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

  private hasConfiguredPaymentProvider() {
    return Boolean(
      ((this.config.get('SSLCOMMERZ_STORE_ID') ||
        this.config.get('SSL_STORE_ID')) &&
        (this.config.get('SSLCOMMERZ_STORE_PASSWORD') ||
          this.config.get('SSL_STORE_PASSWORD'))) ||
      (this.config.get('AAMARPAY_STORE_ID') &&
        this.config.get('AAMARPAY_SIGNATURE_KEY')),
    );
  }

  private clean(value?: string | null): string | undefined {
    return value?.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }

  private cleanNullable(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    return this.clean(value) || null;
  }

  private normalizePhone(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (!value?.trim()) return null;
    return normalizeBangladeshPhone(value);
  }

  private assertTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      throw new BadRequestException('Timezone must be a valid IANA timezone');
    }
  }
}
