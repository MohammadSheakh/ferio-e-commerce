import type { CloudinaryStrategy } from '../attachments/strategies/cloudinary.strategy';
import type { CommerceSettingsService } from '../settings/services/commerce-settings.service';
import { WarrantyController } from './warranty.controller';
import type { WarrantyService } from './warranty.service';

describe('WarrantyController', () => {
  const service = {};
  const upload = { uploadFile: jest.fn() };
  const settings = { get: jest.fn() };
  const controller = new WarrantyController(
    service as unknown as WarrantyService,
    upload as unknown as CloudinaryStrategy,
    settings as unknown as CommerceSettingsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    settings.get.mockResolvedValue({ warrantyClaimsEnabled: true });
  });

  it('returns evidence in the claim-creation contract', async () => {
    upload.uploadFile.mockResolvedValue({
      url: 'https://cdn.example.com/warranty/item.webp',
      publicId: 'warranty/item',
      size: 1024,
      mimeType: 'webp',
    });

    await expect(
      controller.evidence([
        {
          originalname: 'item.webp',
          mimetype: 'image/webp',
        } as Express.Multer.File,
      ]),
    ).resolves.toEqual([
      {
        imageUrl: 'https://cdn.example.com/warranty/item.webp',
        publicId: 'warranty/item',
      },
    ]);
    expect(upload.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'item.webp' }),
      'warranty',
    );
  });
});
