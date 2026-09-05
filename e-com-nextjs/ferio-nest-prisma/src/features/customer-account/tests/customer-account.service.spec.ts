import { ConflictException, NotFoundException } from '@nestjs/common';
import type { UserPayload } from '@app/common';
import type { PrismaService } from '@app/database';
import { CustomerAccountService } from '../customer-account.service';

const actor = {
  userId: 'user-1',
  email: 'rahim@example.com',
  role: 'user',
} as UserPayload;

describe('CustomerAccountService', () => {
  const prisma = {
    order: { findUnique: jest.fn() },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new CustomerAccountService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('links only after exact order phone verification', async () => {
    prisma.order.findUnique.mockResolvedValue({
      customerId: 'customer-1',
      address: { phoneNormalized: '+8801712345678' },
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({ customerId: null })
      .mockResolvedValueOnce({
        id: actor.userId,
        name: 'Rahim',
        email: actor.email,
        phoneNumber: null,
        isEmailVerified: true,
        customer: null,
      });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ id: actor.userId });

    await service.link(
      { reference: ' fer-001 ', phone: '01712-345678' },
      actor,
    );

    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reference: 'FER-001' } }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: actor.userId },
      data: { customerId: 'customer-1' },
    });
  });

  it('does not reveal whether the order or phone was wrong', async () => {
    prisma.order.findUnique.mockResolvedValue({
      customerId: 'customer-1',
      address: { phoneNormalized: '+8801712345678' },
    });

    await expect(
      service.link({ reference: 'FER-001', phone: '01812345678' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents relinking either side to a different identity', async () => {
    prisma.order.findUnique.mockResolvedValue({
      customerId: 'customer-2',
      address: { phoneNormalized: '+8801712345678' },
    });
    prisma.user.findUnique.mockResolvedValue({ customerId: 'customer-1' });

    await expect(
      service.link({ reference: 'FER-002', phone: '01712345678' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
