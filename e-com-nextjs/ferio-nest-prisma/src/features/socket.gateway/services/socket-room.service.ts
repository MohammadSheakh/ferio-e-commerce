import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import type { Socket } from 'socket.io';

import { REDIS_CLIENT } from '@app/redis';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import type { PrismaClient } from '@prisma/client';
import { tryGetTenantContext } from '../../../tenancy/tenant-context';
import { TenantFanoutService } from '../../../tenancy/tenant-fanout.service';
import { scopedSocketRoom } from './socket-auth.service';
import { errorMessage } from '@app/common';

/**
 * Socket Room Service
 * 
 * 📚 SOCKET.IO ROOM MANAGEMENT
 */
@Injectable()
export class SocketRoomService {
  private readonly logger = new Logger(SocketRoomService.name);
  private readonly KEYS = {
    // Room management
    USER_ROOMS: 'chat:user_rooms:',
    ROOM_USERS: 'chat:room_users:',

    // Task rooms
    TASK_ROOMS: 'task:rooms:',
    USER_TASKS: 'task:user_tasks:',

    // Group rooms
    GROUP_ROOMS: 'group:rooms:',
    USER_GROUPS: 'group:user_groups:',

    // Activity feed
    ACTIVITY_FEED: 'activity:feed:',
  };

  constructor(
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

  // =============================================
  // Conversation Room Management
  // =============================================

  async joinRoom(userId: string, roomId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.sadd(this.key(this.KEYS.USER_ROOMS, userId, organizationId), roomId);
    pipeline.sadd(this.key(this.KEYS.ROOM_USERS, roomId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`👥 User ${userId} joined room ${roomId}`);
  }

  async leaveRoom(userId: string, roomId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.srem(this.key(this.KEYS.USER_ROOMS, userId, organizationId), roomId);
    pipeline.srem(this.key(this.KEYS.ROOM_USERS, roomId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`👥 User ${userId} left room ${roomId}`);
  }

  async getRoomUsers(roomId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.ROOM_USERS, roomId, organizationId),
    );
  }

  async isUserInRoom(userId: string, roomId: string, organizationId?: string): Promise<boolean> {
    const isMember = await this.redisClient.sismember(
      this.key(this.KEYS.ROOM_USERS, roomId, organizationId),
      userId,
    );
    return isMember === 1;
  }

  async getUserRooms(userId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.USER_ROOMS, userId, organizationId),
    );
  }

  async removeUserFromAllRooms(userId: string, organizationId?: string): Promise<void> {
    const userRooms = await this.getUserRooms(userId, organizationId);

    if (userRooms.length === 0) return;

    const pipeline = this.redisClient.multi();

    for (const roomId of userRooms) {
      pipeline.srem(this.key(this.KEYS.ROOM_USERS, roomId, organizationId), userId);
    }

    pipeline.del(this.key(this.KEYS.USER_ROOMS, userId, organizationId));

    await pipeline.exec();

    this.logger.log(`🧹 Removed user ${userId} from ${userRooms.length} rooms`);
  }

  // =============================================
  // Task Room Management
  // =============================================

  async joinTaskRoom(userId: string, taskId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.sadd(this.key(this.KEYS.USER_TASKS, userId, organizationId), taskId);
    pipeline.sadd(this.key(this.KEYS.TASK_ROOMS, taskId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`📋 User ${userId} joined task room ${taskId}`);
  }

  async leaveTaskRoom(userId: string, taskId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.srem(this.key(this.KEYS.USER_TASKS, userId, organizationId), taskId);
    pipeline.srem(this.key(this.KEYS.TASK_ROOMS, taskId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`📋 User ${userId} left task room ${taskId}`);
  }

  async getTaskRoomUsers(taskId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.TASK_ROOMS, taskId, organizationId),
    );
  }

  async isUserInTaskRoom(userId: string, taskId: string, organizationId?: string): Promise<boolean> {
    const isMember = await this.redisClient.sismember(
      this.key(this.KEYS.USER_TASKS, userId, organizationId),
      taskId,
    );
    return isMember === 1;
  }

  async getUserTaskRooms(userId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.USER_TASKS, userId, organizationId),
    );
  }

  async removeUserFromAllTaskRooms(userId: string, organizationId?: string): Promise<void> {
    const userTaskRooms = await this.getUserTaskRooms(userId, organizationId);

    if (userTaskRooms.length === 0) return;

    const pipeline = this.redisClient.multi();

    for (const taskId of userTaskRooms) {
      pipeline.srem(this.key(this.KEYS.TASK_ROOMS, taskId, organizationId), userId);
    }

    pipeline.del(this.key(this.KEYS.USER_TASKS, userId, organizationId));

    await pipeline.exec();

    this.logger.log(`🧹 Removed user ${userId} from ${userTaskRooms.length} task rooms`);
  }

  // =============================================
  // Group/Family Room Management
  // =============================================

  async joinGroupRoom(userId: string, groupId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.sadd(this.key(this.KEYS.USER_GROUPS, userId, organizationId), groupId);
    pipeline.sadd(this.key(this.KEYS.GROUP_ROOMS, groupId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`👨‍👩‍👧‍👦 User ${userId} joined group room ${groupId}`);
  }

  async leaveGroupRoom(userId: string, groupId: string, organizationId?: string): Promise<void> {
    const pipeline = this.redisClient.multi();

    pipeline.srem(this.key(this.KEYS.USER_GROUPS, userId, organizationId), groupId);
    pipeline.srem(this.key(this.KEYS.GROUP_ROOMS, groupId, organizationId), userId);

    await pipeline.exec();

    this.logger.log(`👨‍👩‍👧‍👦 User ${userId} left group room ${groupId}`);
  }

  async getGroupRoomUsers(groupId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.GROUP_ROOMS, groupId, organizationId),
    );
  }

  async isUserInGroupRoom(userId: string, groupId: string, organizationId?: string): Promise<boolean> {
    const isMember = await this.redisClient.sismember(
      this.key(this.KEYS.USER_GROUPS, userId, organizationId),
      groupId,
    );
    return isMember === 1;
  }

  async getUserGroupRooms(userId: string, organizationId?: string): Promise<string[]> {
    return await this.redisClient.smembers(
      this.key(this.KEYS.USER_GROUPS, userId, organizationId),
    );
  }

  async removeUserFromAllGroupRooms(userId: string, organizationId?: string): Promise<void> {
    const userGroupRooms = await this.getUserGroupRooms(userId, organizationId);

    if (userGroupRooms.length === 0) return;

    const pipeline = this.redisClient.multi();

    for (const groupId of userGroupRooms) {
      pipeline.srem(this.key(this.KEYS.GROUP_ROOMS, groupId, organizationId), userId);
    }

    pipeline.del(this.key(this.KEYS.USER_GROUPS, userId, organizationId));

    await pipeline.exec();

    this.logger.log(`🧹 Removed user ${userId} from ${userGroupRooms.length} group rooms`);
  }

  /**
   * Auto-join Family Room
   */
  async autoJoinFamilyRoom(
    socket: Pick<Socket, 'join'>,
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    return this.inOrganization(organizationId, () =>
      this.autoJoinFamilyRoomInContext(socket, userId, organizationId),
    );
  }

  private async autoJoinFamilyRoomInContext(
    socket: Pick<Socket, 'join'>,
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    const db = await this.db();
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, accountCreatorId: true },
      });

      if (!user) return;

      let familyRoomId: string | null = null;

      if ((user.role as string) === 'child' && user.accountCreatorId) {
        familyRoomId = user.accountCreatorId;
        this.logger.log(`👨‍👩‍👧‍👦 User ${userId} joining family room ${familyRoomId} (as child)`);
      } else if ((user.role as string) === 'business') {
        familyRoomId = userId;
        this.logger.log(`👨‍👩‍👧‍👦 User ${userId} joining family room ${familyRoomId} (as business user)`);
      }

      if (familyRoomId) {
        await this.joinGroupRoom(userId, familyRoomId, organizationId);
        socket.join(scopedSocketRoom({ organizationId }, familyRoomId));
        this.logger.log(`✅ User ${userId} auto-joined family room ${familyRoomId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error auto-joining family room: ${errorMessage(error)}`);
    }
  }

  // =============================================
  // Activity Feed Management
  // =============================================

  async addActivityToFeed(
    groupId: string,
    activity: unknown,
    maxActivities: number = 50,
    organizationId?: string,
  ): Promise<void> {
    const activityKey = this.key(this.KEYS.ACTIVITY_FEED, groupId, organizationId);

    await this.redisClient.lpush(activityKey, JSON.stringify(activity));
    await this.redisClient.ltrim(activityKey, 0, maxActivities - 1);
    await this.redisClient.expire(activityKey, 7 * 24 * 60 * 60);

    this.logger.log(`📢 Added activity to group ${groupId} feed`);
  }

  async getActivityFeed(
    groupId: string,
    limit: number = 10,
    organizationId?: string,
  ): Promise<unknown[]> {
    const activityKey = this.key(this.KEYS.ACTIVITY_FEED, groupId, organizationId);
    const activities = await this.redisClient.lrange(activityKey, 0, limit - 1);
    return activities.map((activity) => JSON.parse(activity) as unknown);
  }

  async clearActivityFeed(groupId: string, organizationId?: string): Promise<void> {
    const activityKey = this.key(this.KEYS.ACTIVITY_FEED, groupId, organizationId);
    await this.redisClient.del(activityKey);
    this.logger.log(`🧹 Cleared activity feed for group ${groupId}`);
  }

  private key(base: string, id: string, organizationId?: string): string {
    const resolvedOrganizationId =
      organizationId ?? tryGetTenantContext()?.organizationId;
    if (
      (process.env.TENANCY_ENABLED || 'false') === 'true' &&
      !resolvedOrganizationId
    ) {
      throw new Error('SOCKET_ORGANIZATION_REQUIRED');
    }
    return resolvedOrganizationId
      ? `org:${resolvedOrganizationId}:${base}${id}`
      : `${base}${id}`;
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
}
