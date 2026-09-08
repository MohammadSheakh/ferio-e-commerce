import type { PrismaService } from '@app/database';
import type { RedisService } from '@app/redis';
import type { AuditService } from '../../audit/services/audit.service';
import { SettingsService } from '../services/settings.service';

describe('SettingsService query boundaries', () => {
  it('allowlists settings filters and sort fields', async () => {
    const prisma = {
      settings: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new SettingsService(
      prisma as unknown as PrismaService,
      {} as RedisService,
      {} as AuditService,
    );

    await service.getAllWithPagination(
      {
        type: 'aboutUs',
        id: 'should-not-be-forwarded',
      },
      { page: 1, limit: 10, sortBy: '-updatedAt' },
    );

    expect(prisma.settings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'aboutUs' },
        orderBy: { updatedAt: 'desc' },
      }),
    );
    expect(prisma.settings.count).toHaveBeenCalledWith({
      where: { type: 'aboutUs' },
    });
  });

  it('ignores invalid filters and falls back to the safe default sort', async () => {
    const prisma = {
      settings: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new SettingsService(
      prisma as unknown as PrismaService,
      {} as RedisService,
      {} as AuditService,
    );

    await service.getAllWithPagination(
      { type: 'not-a-settings-type', secret: 'ignored' },
      { page: 1, limit: 10, sortBy: '-secret' },
    );

    expect(prisma.settings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { type: 'desc' } }),
    );
  });
});
