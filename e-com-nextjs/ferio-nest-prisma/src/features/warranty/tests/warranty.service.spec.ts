import type { PrismaService } from '@app/database';
import { WarrantyService } from '../warranty.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('WarrantyService', () => {
  const prisma = {
    warrantyClaim: {
      findMany: jest.fn<(query: unknown) => Promise<unknown[]>>(),
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
    const calls = prisma.warrantyClaim.findMany.mock.calls as unknown as Array<
      [unknown]
    >;
    const query = calls.at(-1)?.[0];
    expect(isRecord(query)).toBe(true);
    if (!isRecord(query)) return;
    expect(query.skip).toBe(20);
    expect(query.take).toBe(20);
    expect(isRecord(query.where)).toBe(true);
    if (!isRecord(query.where)) return;
    expect(query.where.status).toBe('UNDER_DIAGNOSIS');
    expect(Array.isArray(query.where.OR)).toBe(true);
    if (!Array.isArray(query.where.OR)) return;
    expect(query.where.OR).toContainEqual({
      reference: {
        contains: 'WAR-1001',
        mode: 'insensitive',
      },
    });
  });
});
