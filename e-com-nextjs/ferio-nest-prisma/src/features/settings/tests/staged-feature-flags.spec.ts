import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '@app/database';
import { PublicServiceController } from '../../service-booking/service-booking.controller';
import type { ServiceBookingService } from '../../service-booking/service-booking.service';
import { WarrantyController } from '../../warranty/warranty.controller';
import type { WarrantyService } from '../../warranty/warranty.service';
import type { CloudinaryStrategy } from '../../attachments/strategies/cloudinary.strategy';
import { StorefrontAnalyticsService } from '../../storefront-analytics/storefront-analytics.service';
import type { CommerceSettingsService } from '../services/commerce-settings.service';

describe('staged feature flag enforcement', () => {
  const settings = {
    get: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('hides services and rejects new bookings while paused', async () => {
    settings.get.mockResolvedValue({ serviceBookingEnabled: false });
    const service = {
      publicServices: jest.fn(),
      service: jest.fn(),
      book: jest.fn(),
    };
    const controller = new PublicServiceController(
      service as unknown as ServiceBookingService,
      settings as unknown as CommerceSettingsService,
    );

    await expect(controller.all()).resolves.toEqual([]);
    await expect(controller.one('repair')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.book({} as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(service.publicServices).not.toHaveBeenCalled();
    expect(service.book).not.toHaveBeenCalled();
  });

  it('blocks warranty verification before upload or claim work starts', async () => {
    settings.get.mockResolvedValue({ warrantyClaimsEnabled: false });
    const warranty = { eligible: jest.fn(), create: jest.fn() };
    const upload = { uploadFile: jest.fn() };
    const controller = new WarrantyController(
      warranty as unknown as WarrantyService,
      upload as unknown as CloudinaryStrategy,
      settings as unknown as CommerceSettingsService,
    );

    await expect(controller.items({} as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.evidence([])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(warranty.eligible).not.toHaveBeenCalled();
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });

  it('accepts but does not persist analytics while collection is paused', async () => {
    settings.get.mockResolvedValue({ storefrontAnalyticsEnabled: false });
    const prisma = { storefrontAnalyticsEvent: { create: jest.fn() } };
    const analytics = new StorefrontAnalyticsService(
      prisma as unknown as PrismaService,
      {} as ConfigService,
      settings as unknown as CommerceSettingsService,
    );

    await expect(
      analytics.create({
        eventId: '9bd111e8-8c9b-4c62-bbe7-dfd0783ec957',
        anonymousId: '269736aa-c50e-4c4f-b53f-cb845e58a07c',
        type: 'SEARCH',
        searchTerm: 'cycle',
      } as never),
    ).resolves.toEqual({ accepted: false, duplicate: false, disabled: true });
    expect(prisma.storefrontAnalyticsEvent.create).not.toHaveBeenCalled();
  });
});
