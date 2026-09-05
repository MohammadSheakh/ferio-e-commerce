import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, PrismaClient, UserProfile } from '@prisma/client';

import { PrismaService } from '@app/database';
import { scopedRedisKey } from '../../../tenancy/redis-keys.util';
import { RedisService } from '@app/redis';
import { USER_CACHE_CONFIG } from '../user/user.constants';
import { TenantDbService } from '../../../tenancy/tenant-db.service';

const publicUserProfileSelect = {
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserProfileSelect;

type UserProfileRecord = Prisma.UserProfileGetPayload<{
  select: typeof publicUserProfileSelect;
}>;

type UserProfileWithUser = Prisma.UserProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        profileImageUrl: true;
        role: true;
      };
    };
  };
}>;

function isUserProfileCache(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.isDeleted === 'boolean';
}

function parseUserProfileCache(value: unknown): UserProfile | null | undefined {
  if (value === null) return null;
  return isUserProfileCache(value) ? value : undefined;
}

/**
 * UserProfile Service
 */
@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }

  private getCacheKey(userId: string): string {
    return scopedRedisKey(USER_CACHE_CONFIG.PREFIX, 'profile', userId);
  }

  /**
   * Find profile by user ID with cache
   */
  async findByUserIdWithCache(userId: string): Promise<UserProfile | null> {
    return this.redisService.getOrSet(
      this.getCacheKey(userId),
      () => this.fetchProfileByUserId(userId),
      USER_CACHE_CONFIG.PROFILE,
      parseUserProfileCache,
    );
  }

  private async fetchProfileByUserId(userId: string) {
    const db = await this.db();
    return db.userProfile.findFirst({
      where: { userId, isDeleted: false },
    });
  }

  /**
   * Update profile with targeted invalidation
   */
  async updateByUserId(
    userId: string,
    data: Prisma.UserProfileUpdateInput,
  ): Promise<UserProfile | null> {
    const db = await this.db();
    const profile = await db.userProfile.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const result = await db.userProfile.update({
      where: { userId },
      data,
    });

    if (result) {
      await this.invalidateCache(userId);
    }

    return result;
  }

  /**
   * Invalidate profile cache using patterns
   */
  async invalidateCache(userId: string): Promise<void> {
    const keys = [
      this.getCacheKey(userId),
      ...USER_CACHE_CONFIG.INVALIDATION_PATTERNS.PROFILE_UPDATED(userId),
    ];
    await this.redisService.invalidate(keys);
    this.logger.debug(`Invalidated cache for user profile: ${userId}`);
  }

  /**
   * Update support mode preference
   */
  async updateSupportMode(
    userId: string,
    supportMode: string,
  ): Promise<UserProfile | null> {
    return this.updateByUserId(userId, { supportMode });
  }

  /**
   * Update notification style preference
   */
  async updateNotificationStyle(
    userId: string,
    notificationStyle: string,
  ): Promise<UserProfile | null> {
    return this.updateByUserId(userId, { notificationStyle });
  }

  /**
   * Get profile with user details
   */
  async getProfileWithUser(userId: string): Promise<UserProfileWithUser> {
    const db = await this.db();
    const profile = await this.findByUserIdWithCache(userId);

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const result = await db.userProfile.findFirst({
      where: { userId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('User profile not found');
    }

    return result;
  }
}
