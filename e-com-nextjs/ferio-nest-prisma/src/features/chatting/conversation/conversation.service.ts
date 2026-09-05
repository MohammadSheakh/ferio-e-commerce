import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Queue } from 'bullmq';

import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { SocketGateway } from '../../socket.gateway/gateway/socket.gateway';
import { SocketRoomService } from '../../socket.gateway/services/socket-room.service';
import {
  BULLMQ_NOTIFY_PARTICIPANTS_QUEUE,
} from '@app/queue';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationType, ParticipantRole } from './conversation.constant';
import { tryGetTenantContext } from '../../../tenancy/tenant-context';
type ChatDb = PrismaClient | Prisma.TransactionClient;

type ConversationMessage = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { name: true; profileImageUrl: true; role: true } };
  };
}>;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
    private readonly socketRoomService: SocketRoomService,
    @Inject(BULLMQ_NOTIFY_PARTICIPANTS_QUEUE)
    private notifyParticipantsQueue: Queue,
  
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: inside a tenant-resolved request this returns the resolved tenant
   * database client; outside one it explicitly falls back to the legacy DB.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }
  /**
   * Create Conversation
   */
  async createConversation(dto: CreateConversationDto, creatorId: string) {
    const db = await this.db();
    const { participants, message, groupName, groupProfilePicture } = dto;
    const allParticipants = [...new Set([...participants, creatorId])];

    if (allParticipants.length < 2) {
      throw new Error('At least 2 participants required');
    }

    const type =
      allParticipants.length > 2
        ? ConversationType.GROUP
        : ConversationType.DIRECT;

    const directKey = [...allParticipants].sort().join(':');
    const result = await db.$transaction(async (tx) => {
      // Serialize direct-conversation creation across API instances without
      // adding a second denormalized participant key to the schema.
      if (type === ConversationType.DIRECT) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${directKey}))`;
      }
      const existingConversation = type === ConversationType.DIRECT
        ? await this.findExistingDirectConversation(tx, allParticipants)
        : null;
      if (existingConversation) return { conversation: existingConversation, created: false, message: null };

      const conversation = await tx.conversation.create({
        data: { creatorId, type: type === ConversationType.GROUP ? 'group' : 'direct', groupName, groupProfilePicture },
      });
      for (const userId of allParticipants) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
        await tx.conversationParticipents.create({
          data: { conversationId: conversation.id, userId, userName: user?.name || 'User', role: userId === creatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER },
        });
      }
      const initialMessage = message
        ? await tx.message.create({
            data: { conversationId: conversation.id, senderId: creatorId, text: message },
            include: { sender: { select: { name: true, profileImageUrl: true, role: true } } },
          })
        : null;
      if (initialMessage) {
        await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageId: initialMessage.id, lastMessageText: message, lastMessageCreatedAt: initialMessage.createdAt } });
      }
      return { conversation, created: true, message: initialMessage };
    });
    if (result.message) await this.notifyParticipantsInConversation(result.conversation.id, result.message);
    return { conversation: result.conversation, created: result.created };
  }

  /**
   * Find existing direct conversation
   */
  private async findExistingDirectConversation(db: ChatDb, participantIds: string[]) {
    const conversations = await db.conversation.findMany({
      where: {
        type: 'direct',
        isDeleted: false,
        participants: {
          every: { userId: { in: participantIds } },
        },
      },
      include: {
        participants: { select: { userId: true } },
      },
      take: 100,
    });

    return (
      conversations.find(
        (c) =>
          c.participants.length === participantIds.length &&
          JSON.stringify(c.participants.map((p) => p.userId).sort()) ===
            JSON.stringify([...participantIds].sort()),
      ) || null
    );
  }

  /**
   * Add participants to conversation
   */
  async addParticipantsToConversation(
    conversationId: string,
    participantIds: string[],
    creatorId: string,
    enforceActorPermission = false,
  ) {
    const db = await this.db();
    if (enforceActorPermission) {
      const actor = await db.conversationParticipents.findFirst({
        where: {
          conversationId,
          userId: creatorId,
          role: ParticipantRole.ADMIN,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (!actor) {
        throw new ForbiddenException(
          'Conversation administrator permission is required',
        );
      }
    }

    for (const userId of participantIds) {
      const existing = await db.conversationParticipents.findFirst({
        where: { userId, conversationId, isDeleted: false },
      });

      if (existing) continue;

      const user = await this.getUserInfo(userId);
      await db.conversationParticipents.create({
        data: {
          conversationId,
          userId,
          userName: user.name,
          role:
            userId === creatorId
              ? ParticipantRole.ADMIN
              : ParticipantRole.MEMBER,
        },
      });
    }
  }

  /**
   * Send Message (integrated with conversation update)
   */
  async sendMessage(conversationId: string, senderId: string, text: string) {
    const db = await this.db();
    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId, text },
        include: { sender: { select: { name: true, profileImageUrl: true, role: true } } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageId: created.id, lastMessageText: text, lastMessageCreatedAt: created.createdAt },
      });
      return created;
    });

    await this.notifyParticipantsInConversation(conversationId, message);

    return message;
  }

  /**
   * Notify participants
   */
  private async notifyParticipantsInConversation(
    conversationId: string,
    message: ConversationMessage,
  ) {
    const db = await this.db();
    const participants = await db.conversationParticipents.findMany({
      where: { conversationId, isDeleted: false },
      select: { userId: true },
    });

    const participantIds = participants.map((p) => p.userId);
    const sender = message.sender;

    await this.notifyParticipantsQueue.add(
      'notify-participants',
      {
        conversationId,
        messageId: message.id,
        messageText: message.text,
        senderId: message.senderId,
        senderProfile: {
          name: sender?.name || 'User',
          profileImage: sender?.profileImageUrl,
          role: sender?.role || 'user',
        },
        participantIds,
        organizationId: tryGetTenantContext()?.organizationId,
      },
      { removeOnComplete: true },
    );
  }

  /**
   * Get conversations for user
   */
  async getConversationsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ) {
    const db = await this.db();
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (page - 1) * limit;

    const participants = await db.conversationParticipents.findMany({
      where: { userId, isDeleted: false },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { name: true, profileImageUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageCreatedAt: 'desc' } },
      skip,
      take: limit,
    });

    const results = await Promise.all(
      participants.map(async (p) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: userId },
            createdAt: { gt: p.lastMessageReadAt || new Date(0) },
            isDeleted: false,
          },
        });

        const otherParticipants = p.conversation.participants.filter(
          (pt) => pt.userId !== userId,
        );

        return {
          id: p.conversationId,
          type: p.conversation.type,
          groupName: p.conversation.groupName,
          lastMessage: p.conversation.lastMessageText,
          lastMessageAt: p.conversation.lastMessageCreatedAt,
          unreadCount,
          participants: otherParticipants.map((pt) => ({
            userId: pt.userId,
            name: pt.userName,
            profileImage: pt.user?.profileImageUrl,
            isOnline: this.socketGateway.isUserOnline(pt.userId),
          })),
        };
      }),
    );

    const total = await db.conversationParticipents.count({
      where: { userId, isDeleted: false },
    });

    return {
      results,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
    };
  }

  /**
   * Remove participant
   */
  async removeParticipant(
    conversationId: string,
    participantId: string,
    actorId: string,
  ) {
    const db = await this.db();
    const actor = await db.conversationParticipents.findFirst({
      where: { conversationId, userId: actorId, isDeleted: false },
      select: { role: true },
    });
    const removingSelf = actorId === participantId;
    if (!actor || (!removingSelf && actor.role !== ParticipantRole.ADMIN)) {
      throw new ForbiddenException(
        'Conversation administrator permission is required',
      );
    }

    await db.conversationParticipents.updateMany({
      where: { conversationId, userId: participantId },
      data: { isDeleted: true },
    });

    await this.socketGateway.emitToRoom(conversationId, 'participant-removed', {
      conversationId,
      participantId,
    });
  }

  /**
   * Mark as read
   */
  async markAsRead(userId: string, conversationId: string) {
    const db = await this.db();
    await db.conversationParticipents.updateMany({
      where: { conversationId, userId },
      data: { lastMessageReadAt: new Date(), unreadCount: 0 },
    });
  }

  /**
   * Get all conversations (Admin)
   */
  async getAllConversations(page: number = 1, limit: number = 50) {
    const db = await this.db();
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (page - 1) * limit;

    const conversations = await db.conversation.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { text: true, createdAt: true, senderId: true },
        },
      },
    });

    const total = await db.conversation.count({
      where: { isDeleted: false },
    });

    const results = conversations.map((conv) => {
      const lastMsg = conv.messages[0];
      return {
        id: conv.id,
        type: conv.type,
        groupName: conv.groupName,
        lastMessage: conv.lastMessageText || lastMsg?.text || 'No messages',
        lastMessageAt:
          conv.lastMessageCreatedAt || lastMsg?.createdAt || conv.updatedAt,
        updatedAt: conv.updatedAt,
      };
    });

    return {
      results,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
    };
  }

  /**
   * Get user info
   */
  private async getUserInfo(userId: string) {
    const db = await this.db();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true, profileImageUrl: true },
    });
    return {
      name: user?.name || 'User',
      role: user?.role || 'user',
      profileImage: user?.profileImageUrl || undefined,
    };
  }
}
