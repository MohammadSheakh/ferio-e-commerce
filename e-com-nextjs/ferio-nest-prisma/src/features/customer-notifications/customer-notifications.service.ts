import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';

export type CreateCustomerNotificationInput = {
  userId: string;
  deduplicationKey: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  linkFor?: string;
  linkId?: string;
  data?: Prisma.InputJsonValue;
};

@Injectable()
export class CustomerNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerNotificationInput) {
    try {
      return await this.prisma.notification.create({
        data: {
          receiverId: input.userId,
          deduplicationKey: input.deduplicationKey,
          type: input.type,
          priority: 'normal',
          status: 'delivered',
          title: input.title,
          message: input.message,
          entityType: input.entityType,
          entityId: input.entityId,
          linkFor: input.linkFor,
          linkId: input.linkId,
          data: input.data,
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.notification.findUnique({
          where: { deduplicationKey: input.deduplicationKey },
        });
      }
      throw error;
    }
  }

  async notifyCustomer(
    customerId: string,
    input: Omit<CreateCustomerNotificationInput, 'userId'>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { customerId },
      select: { id: true, isDeleted: true },
    });
    if (!user || user.isDeleted) return null;
    return this.create({ ...input, userId: user.id });
  }

  async list(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const boundedPage = Math.max(1, page);
    const boundedLimit = Math.min(50, Math.max(1, limit));
    const where: Prisma.NotificationWhereInput = {
      receiverId: userId,
      isDeleted: false,
      ...(unreadOnly ? { isRead: false } : {}),
    };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (boundedPage - 1) * boundedLimit,
        take: boundedLimit,
        select: {
          id: true,
          type: true,
          priority: true,
          title: true,
          message: true,
          entityType: true,
          entityId: true,
          linkFor: true,
          linkId: true,
          data: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { receiverId: userId, isDeleted: false, isRead: false },
      }),
    ]);
    return {
      items,
      page: boundedPage,
      limit: boundedLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / boundedLimit)),
      unread,
    };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { receiverId: userId, isDeleted: false, isRead: false },
    });
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, receiverId: userId, isDeleted: false },
      data: { isRead: true, readAt: new Date(), status: 'read' },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { id, isRead: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { receiverId: userId, isDeleted: false, isRead: false },
      data: { isRead: true, readAt: new Date(), status: 'read' },
    });
    return { modifiedCount: result.count };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, receiverId: userId, isDeleted: false },
      data: { isDeleted: true },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { id, deleted: true };
  }
}
