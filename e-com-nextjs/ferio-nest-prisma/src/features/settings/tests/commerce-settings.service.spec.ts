import { BadRequestException, ConflictException } from '@nestjs/common';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import type { AuditService } from '../../audit/services/audit.service';
import type { ConfigService } from '@nestjs/config';
import { CommerceSettingsService } from '../services/commerce-settings.service';

const actor = { userId: 'admin-1', role: 'admin' } as UserPayload;
const previous = {
  id: 'default',
  storeName: 'Ferio',
  legalName: null,
  supportPhone: null,
  supportEmail: null,
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  orderPrefix: 'FER',
  defaultReturnWindowDays: null,
  codEnabled: true,
  prepaidEnabled: false,
  serviceBookingEnabled: true,
  warrantyClaimsEnabled: true,
  storefrontAnalyticsEnabled: true,
  categoryTopNavEnabled: true,
  categorySideNavEnabled: true,
  purchaseActivityEnabled: false,
  purchaseHistoryEnabled: false,
  purchaseActivityShowDistrict: false,
  purchaseActivityShowArea: false,
  purchaseActivityDurationMs: 4000,
  purchaseActivityIntervalSeconds: 12,
  purchaseActivityMaxAgeDays: 30,
  purchaseActivityExcludedProductIds: [],
  termsUrl: null,
  privacyUrl: null,
  returnPolicyUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CommerceSettingsService', () => {
  const audit = { record: jest.fn() };
  const transaction = {
    commerceSettings: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    commerceSettings: { upsert: jest.fn() },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const service = new CommerceSettingsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    { get: jest.fn().mockReturnValue('') } as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.commerceSettings.upsert.mockResolvedValue(previous);
    transaction.commerceSettings.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...previous, ...data }),
    );
    audit.record.mockResolvedValue({ id: 'audit-1' });
  });

  it('returns only customer-safe public settings', async () => {
    prisma.commerceSettings.upsert.mockResolvedValue(previous);

    await expect(service.getPublic()).resolves.toEqual({
      storeName: 'Ferio',
      legalName: null,
      supportPhone: null,
      supportEmail: null,
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      defaultReturnWindowDays: null,
      codEnabled: true,
      prepaidEnabled: false,
      serviceBookingEnabled: true,
      warrantyClaimsEnabled: true,
      storefrontAnalyticsEnabled: true,
      purchaseActivityEnabled: false,
      purchaseHistoryEnabled: false,
      categoryTopNavEnabled: true,
      categorySideNavEnabled: true,
      termsUrl: null,
      privacyUrl: null,
      returnPolicyUrl: null,
    });
  });

  it('normalizes values and audits the same transaction', async () => {
    const result = await service.update(
      {
        storeName: '  Ferio Store  ',
        supportPhone: '01712-345678',
        supportEmail: 'OPS@FERIO.COM',
        orderPrefix: 'fr2',
        timezone: 'Asia/Dhaka',
      },
      actor,
    );

    expect(transaction.commerceSettings.update).toHaveBeenCalledWith({
      where: { id: 'default' },
      data: expect.objectContaining({
        storeName: 'Ferio Store',
        supportPhone: '+8801712345678',
        supportEmail: 'ops@ferio.com',
        orderPrefix: 'FR2',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMERCE_SETTINGS_UPDATED',
        actor,
        previousValue: previous,
        newValue: result,
      }),
      transaction,
    );
  });

  it('updates staged rollout flags inside the audited settings transaction', async () => {
    const result = await service.update(
      {
        serviceBookingEnabled: false,
        warrantyClaimsEnabled: false,
        storefrontAnalyticsEnabled: false,
      },
      actor,
    );

    expect(transaction.commerceSettings.update).toHaveBeenCalledWith({
      where: { id: 'default' },
      data: expect.objectContaining({
        serviceBookingEnabled: false,
        warrantyClaimsEnabled: false,
        storefrontAnalyticsEnabled: false,
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: result }),
      transaction,
    );
  });

  it('rejects an invalid IANA timezone', async () => {
    await expect(
      service.update({ timezone: 'Dhaka/Unknown' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps prepaid disabled until a provider is approved', async () => {
    await expect(
      service.update({ prepaidEnabled: true }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
