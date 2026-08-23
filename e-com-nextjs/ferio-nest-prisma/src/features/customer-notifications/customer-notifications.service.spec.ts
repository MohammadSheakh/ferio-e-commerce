import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '@app/database';
import { CustomerNotificationsService } from './customer-notifications.service';

describe('CustomerNotificationsService', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new CustomerNotificationsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only the authenticated customer notifications', async () => {
    prisma.notification.findMany.mockResolvedValueOnce([{ id: 'notice-1' }]);
    prisma.notification.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    await expect(service.list('user-1', 2, 10, true)).resolves.toMatchObject({
      items: [{ id: 'notice-1' }],
      page: 2,
      limit: 10,
      total: 1,
      unread: 3,
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receiverId: 'user-1', isDeleted: false, isRead: false },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('does not mark another customer notification as read', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.markRead('user-1', 'notice-2')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notice-2', receiverId: 'user-1', isDeleted: false },
      data: { isRead: true, readAt: expect.any(Date), status: 'read' },
    });
  });

  it('soft-deletes only an owned notification', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(service.remove('user-1', 'notice-1')).resolves.toEqual({
      id: 'notice-1',
      deleted: true,
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notice-1', receiverId: 'user-1', isDeleted: false },
      data: { isDeleted: true },
    });
  });
});
