import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@app/redis';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import type { PrismaClient } from '@prisma/client';
import { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { errorMessage } from '@app/common';

export interface SocketUser {
  userId: string;
  role: string;
  name: string;
  /** Resolved tenant binding (MT-8 §11.3): present when the ticket was
   * minted inside a tenant-resolved storefront request. */
  organizationId?: string;
}

/** Tenant-scoped room names (MT-8 §11.3): identical room identifiers across
 * tenants can never share a channel. Legacy sockets keep historical names. */
export function scopedSocketRoom(user: { organizationId?: string } | null | undefined, room: string): string {
  return user?.organizationId ? `org:${user.organizationId}:${room}` : room;
}

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin']);
const GUEST_ID_PATTERN = /^gst_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function socketPresenceKeys(organizationId?: string) {
  const scope = organizationId ? `org:${organizationId}` : 'legacy';
  const prefix = `chat:presence:${scope}`;
  return {
    onlineUsers: `${prefix}:online-users`,
    userSockets: (userId: string) => `${prefix}:user:${userId}:sockets`,
    socketUser: (socketId: string) => `${prefix}:socket:${socketId}`,
    userStatus: (userId: string) => `${prefix}:user:${userId}:status`,
  };
}

/**
 * Socket Auth Service
 * 
 * 📚 SOCKET.IO AUTHENTICATION & USER TRACKING
 */
@Injectable()
export class SocketAuthService {
  private readonly logger = new Logger(SocketAuthService.name);

  constructor(
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
    private prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
    @Optional() private readonly fanout?: TenantFanoutService,
  ) {}

  /**
   * MT-7/MT-8: tenant client inside resolved contexts; explicit legacy
   * fallback outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : (this.prisma as PrismaClient);
  }

  /**
   * Authenticate Socket Connection
   */
  async authenticateSocket(socket: Socket): Promise<SocketUser | null> {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers?.token as string);
      const guestId = socket.handshake.auth?.guestId || (socket.handshake.query?.guestId as string);

      if (!token) {
        if ((process.env.TENANCY_ENABLED || 'false') === 'true') return null;
        return {
          userId: this.normalizeGuestId(guestId) || `guest_${socket.id.slice(0, 8)}`,
          role: 'guest',
          name: 'Guest Visitor',
        };
      }

      // Verify JWT token
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_ACCESS_SECRET as string,
        });

        const organizationId = String(payload?.organizationId || '');
        if (
          (process.env.TENANCY_ENABLED || 'false') === 'true' &&
          (!organizationId || payload?.purpose !== 'chat_socket')
        ) {
          return null;
        }

        if (payload?.purpose === 'chat_socket' && payload.userId && payload.role === 'guest') {
          const normalizedGuestId = this.normalizeGuestId(payload.userId);
          return {
            userId: normalizedGuestId || `guest_${socket.id.slice(0, 8)}`,
            role: 'guest',
            name: 'Guest Visitor',
            organizationId: organizationId || undefined,
          };
        }

        const targetId = payload?.userId || payload?.sub || payload?.id;

        if (targetId) {
          return this.inOrganization(organizationId || undefined, async () => {
            const db = await this.db();
            const user = await db.user.findUnique({
              where: { id: targetId },
              select: { id: true, role: true, name: true },
            });

            if (user) {
              return {
                userId: user.id,
                role: user.role,
                name: user.name,
                organizationId: organizationId || undefined,
              };
            }

            const rider = await db.deliveryPersonnel.findUnique({
              where: { id: targetId },
              select: { id: true, name: true },
            });
            if (!rider) return null;
            return {
              userId: rider.id,
              role: 'delivery_man',
              name: rider.name || 'Delivery Rider',
              organizationId: organizationId || undefined,
            };
          });
        }
      } catch {
        // A supplied-but-invalid token must never silently downgrade into a
        // guest session bound to a client-asserted ID. Reject the socket;
        // genuine guests connect without a token.
        return null;
      }

      return {
        userId: this.normalizeGuestId(guestId) || `guest_${socket.id.slice(0, 8)}`,
        role: 'guest',
        name: 'Guest Visitor',
      };
    } catch (error) {
      this.logger.warn(`⚠️ Socket authentication failed: ${errorMessage(error)}`);
      return null;
    }
  }

  private inOrganization<T>(
    organizationId: string | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') return operation();
    if (!organizationId) throw new Error('SOCKET_ORGANIZATION_REQUIRED');
    if (!this.fanout) throw new Error('TENANT_FANOUT_UNAVAILABLE');
    return this.fanout.forOrganization(organizationId, operation);
  }

  issueSocketTicket(user: {
    userId: string;
    email?: string;
    role: string;
    organizationId?: string;
  }) {
    if (
      (process.env.TENANCY_ENABLED || 'false') === 'true' &&
      !user.organizationId
    ) {
      throw new Error('SOCKET_ORGANIZATION_REQUIRED');
    }
    return this.jwtService.signAsync(
      {
        userId: user.userId,
        email: user.email || '',
        role: user.role,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
        purpose: 'chat_socket',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '5m',
      },
    );
  }

  issueGuestSocketTicket(guestId: string, organizationId?: string) {
    const normalizedGuestId = this.normalizeGuestId(guestId);
    if (!normalizedGuestId) return null;
    return this.issueSocketTicket({
      userId: normalizedGuestId,
      role: 'guest',
      organizationId,
    });
  }

  async canAccessConversation(user?: SocketUser | null, conversationId?: string): Promise<boolean> {
    if (!user || !conversationId) return false;
    if (this.isAdmin(user.role)) return true;

    return this.inOrganization(user.organizationId, async () => {
      const allowedIds = new Set([user.userId, `conv-${user.userId}`]);
      if (user.role !== 'guest' && user.userId) {
        const db = await this.db();
        const account = await db.user.findUnique({
          where: { id: user.userId },
          select: { customerId: true },
        });
        if (account?.customerId) {
          allowedIds.add(account.customerId);
          allowedIds.add(`conv-${account.customerId}`);
        }
      }
      if (allowedIds.has(conversationId)) return true;
      const db = await this.db();
      const participant = await db.conversationParticipents?.findFirst?.({
        where: { conversationId, userId: user.userId, isDeleted: false },
        select: { id: true },
      });
      return !!participant;
    });
  }

  isAdmin(role?: string) {
    return ADMIN_ROLES.has(String(role || '').toLowerCase());
  }

  private normalizeGuestId(guestId?: string) {
    if (!guestId || !GUEST_ID_PATTERN.test(guestId)) return null;
    return guestId.toLowerCase();
  }

  /**
   * Handle User Connection
   */
  async handleUserConnection(socket: Socket, user: SocketUser): Promise<void> {
    const userId = user.userId;
    const socketId = socket.id;
    const workerId = process.pid.toString();

    // Add new connection
    await this.addOnlineUser(userId, socketId, workerId, user);

    this.logger.log(`✅ User ${userId} connected (Socket: ${socketId}, Worker: ${workerId})`);

  }

  /**
   * Handle User Disconnection
   */
  async handleUserDisconnection(socket: Socket, user: SocketUser): Promise<boolean> {
    const userId = user.userId;
    const socketId = socket.id;

    this.logger.log(`🔌 User disconnected: ${userId} (Socket: ${socketId})`);

    try {
      // Remove from Redis state
      return await this.removeOnlineUser(user, socketId);
    } catch (error) {
      this.logger.error(`❌ Error handling user disconnection: ${errorMessage(error)}`);
      return false;
    }
  }

  async getUserProfile(userId: string) {
    const db = await this.db();
    return await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
  }

  /** Resolve a Prisma client only from the organization signed into the ticket. */
  async databaseForSocket(user: SocketUser): Promise<PrismaClient> {
    return this.inOrganization(user.organizationId, () => this.db());
  }

  /**
   * Add Online User to Redis
   */
  private async addOnlineUser(
    userId: string,
    socketId: string,
    workerId: string,
    userInfo?: any,
  ): Promise<void> {
    const organizationId = (userInfo as SocketUser | undefined)?.organizationId;
    const keys = this.keysFor(organizationId);
    const pipeline = this.redisClient.multi();

    // Add to online users set
    pipeline.sadd(keys.onlineUsers, userId);

    // A user may have multiple tabs/devices in the same organization.
    pipeline.sadd(keys.userSockets(userId), socketId);

    // Store reverse socket ownership for diagnostics and cleanup.
    pipeline.hset(keys.socketUser(socketId), {
      userId,
      workerId,
      connectedAt: Date.now().toString(),
      userInfo: JSON.stringify(userInfo || {}),
    });

    // Set user status
    pipeline.hset(keys.userStatus(userId), {
      isOnline: 'true',
      lastSeen: Date.now().toString(),
      workerId,
    });

    await pipeline.exec();

    this.logger.debug(`✅ User ${userId} added to Redis state (Worker: ${workerId})`);
  }

  /**
   * Remove Online User from Redis
   */
  private async removeOnlineUser(user: SocketUser, socketId: string): Promise<boolean> {
    const keys = this.keysFor(user.organizationId);
    const remaining = Number(
      await this.redisClient.eval(
        `redis.call('SREM', KEYS[1], ARGV[2])
         redis.call('DEL', KEYS[2])
         local remaining = redis.call('SCARD', KEYS[1])
         if remaining == 0 then
           redis.call('SREM', KEYS[3], ARGV[1])
           redis.call('HSET', KEYS[4], 'isOnline', 'false', 'lastSeen', ARGV[3])
         end
         return remaining`,
        4,
        keys.userSockets(user.userId),
        keys.socketUser(socketId),
        keys.onlineUsers,
        keys.userStatus(user.userId),
        user.userId,
        socketId,
        Date.now().toString(),
      ),
    );
    const offline = remaining === 0;
    this.logger.debug(`User ${user.userId} socket removed; remaining=${remaining}`);
    return offline;
  }

  /**
   * Check if User is Online
   */
  async isUserOnline(userId: string, organizationId?: string): Promise<boolean> {
    const isMember = await this.redisClient.sismember(
      this.keysFor(organizationId).onlineUsers,
      userId,
    );
    return isMember === 1;
  }

  /**
   * Get All Online Users
   */
  async getAllOnlineUsers(organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(this.keysFor(organizationId).onlineUsers);
  }

  /**
   * Get Related Online Users
   * 
   * Returns online users that the current user is related to (family or conversations)
   */
  async getRelatedOnlineUsers(socketUser: SocketUser): Promise<string[]> {
    const userId = socketUser.userId;
    try {
      return await this.inOrganization(socketUser.organizationId, async () => {
        const db = await this.db();
        const allOnlineUsers = await this.getAllOnlineUsers(socketUser.organizationId);
        if (allOnlineUsers.length === 0) return [];

        const relatedUserIds = new Set<string>();

      // 1. Get family-related users from Prisma
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, accountCreatorId: true, childAccounts: { select: { id: true } } },
      });

      if (user) {
        if (user.accountCreatorId) relatedUserIds.add(user.accountCreatorId);
        user.childAccounts.forEach(child => relatedUserIds.add(child.id));
      }

      // 2. Get conversation-related users from Prisma
      const userParticipations = await db.conversationParticipents.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        select: { conversationId: true },
      });

      if (userParticipations.length > 0) {
        const conversationIds = userParticipations.map((p) => p.conversationId);
        const otherParticipants = await db.conversationParticipents.findMany({
          where: {
            conversationId: { in: conversationIds },
            userId: { not: userId },
            isDeleted: false,
          },
          select: { userId: true },
        });

        otherParticipants.forEach((p) => relatedUserIds.add(p.userId));
      }

      // Filter only those who are online
      const relatedOnlineUsers = allOnlineUsers.filter(onlineId => 
        relatedUserIds.has(onlineId) || onlineId === userId
      );

        return relatedOnlineUsers;
      });
    } catch (error) {
      this.logger.error(`❌ Error getting related online users: ${errorMessage(error)}`);
      return [];
    }
  }

  /**
   * Get Online Users Count
   */
  async getOnlineUsersCount(organizationId?: string): Promise<number> {
    return await this.redisClient.scard(this.keysFor(organizationId).onlineUsers);
  }

  /**
   * Get System Stats
   */
  async getSystemStats(organizationId?: string): Promise<any> {
    return {
      totalOnlineUsers: await this.getOnlineUsersCount(organizationId),
      onlineUsers: await this.getAllOnlineUsers(organizationId),
      timestamp: Date.now(),
    };
  }

  private keysFor(organizationId?: string) {
    if ((process.env.TENANCY_ENABLED || 'false') === 'true' && !organizationId) {
      throw new Error('SOCKET_ORGANIZATION_REQUIRED');
    }
    return socketPresenceKeys(organizationId);
  }
}
