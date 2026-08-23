import type { PrismaService } from '@app/database';
import { WarrantyService } from './warranty.service';

describe('WarrantyService', () => {
  const prisma = {
    warrantyClaim: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const service = new WarrantyService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates and searches the admin warranty queue', async () => {
    prisma.warrantyClaim.findMany.mockResolvedValue([{ id: 'claim-1' }]);
    prisma.warrantyClaim.count.mockResolvedValue(41);

    await expect(
      service.all({
        status: 'UNDER_DIAGNOSIS',
        search: '  WAR-1001  ',
        page: 2,
        limit: 20,
      }),
    ).resolves.toEqual({
      items: [{ id: 'claim-1' }],
      total: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
    expect(prisma.warrantyClaim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          status: 'UNDER_DIAGNOSIS',
          OR: expect.arrayContaining([
            {
              reference: {
                contains: 'WAR-1001',
                mode: 'insensitive',
              },
            },
          ]),
        }),
      }),
    );
  });
});
