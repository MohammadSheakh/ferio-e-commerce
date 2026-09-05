import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { RedisService } from '@app/redis';
import { PrismaService } from '@app/database';
import { scopedRedisKey } from '../../../tenancy/redis-keys.util';
import { USER_CACHE_CONFIG } from './user.constants';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TenantDbService } from '../../../tenancy/tenant-db.service';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  profileImageUrl: true,
  phoneNumber: true,
  isEmailVerified: true,
  authProvider: true,
  preferredTime: true,
  isResetPassword: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userWithPasswordSelect = {
  ...publicUserSelect,
  password: true,
} satisfies Prisma.UserSelect;

type PublicUserRecord = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

type UserWithPasswordRecord = Prisma.UserGetPayload<{
  select: typeof userWithPasswordSelect;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPublicUserCache(value: unknown): value is PublicUserRecord {
  return isRecord(value) &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.id === 'string' &&
    typeof value.isDeleted === 'boolean';
}

function parsePublicUserCache(value: unknown): PublicUserRecord | null | undefined {
  if (value === null) return null;
  return isPublicUserCache(value) ? value : undefined;
}

function isUserStatisticsCache(
  value: unknown,
): value is { totalChildren: number } {
  if (!isRecord(value) || typeof value.totalChildren !== 'number') {
    return false;
  }
  return true;
}

function parseUserStatisticsCache(
  value: unknown,
): { totalChildren: number } | undefined {
  return isUserStatisticsCache(value) ? value : undefined;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

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

  private getCacheKey(type: 'profile' | 'stats', id: string): string {
    return type === 'profile'
      ? scopedRedisKey(USER_CACHE_CONFIG.PREFIX, id)
      : scopedRedisKey(USER_CACHE_CONFIG.PREFIX, 'stats', id);
  }

  async findById(id: string): Promise<PublicUserRecord | null> {
    const db = await this.db();
    return db.user.findUnique({
      where: { id, isDeleted: false },
      select: publicUserSelect,
    });
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<PublicUserRecord | UserWithPasswordRecord | null> {
    const db = await this.db();
    return db.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isDeleted: false,
      },
      select: includePassword ? userWithPasswordSelect : publicUserSelect,
    });
  }

  /**
   * Update user and their profile (nested)
   * This is explicit and safe.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUserRecord | null> {
    const db = await this.db();
    const { name, phoneNumber, ...profileData } = dto;

    const updateData: Prisma.UserUpdateInput = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (Object.keys(profileData).length > 0) {
      updateData.ownedProfile = {
        upsert: {
          create: { ...profileData },
          update: { ...profileData },
        },
      };
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: publicUserSelect,
    });

    if (updatedUser) {
      await this.invalidateCache(userId);
    }

    return updatedUser;
  }

  async findByIdWithCache(id: string): Promise<PublicUserRecord | null> {
    return this.redisService.getOrSet(
      this.getCacheKey('profile', id),
      () => this.fetchUserById(id),
      USER_CACHE_CONFIG.PROFILE,
      parsePublicUserCache,
    );
  }

  private async fetchUserById(id: string): Promise<PublicUserRecord | null> {
    return this.findById(id);
  }

  async invalidateCache(id: string): Promise<void> {
    const keys = USER_CACHE_CONFIG.INVALIDATION_PATTERNS.PROFILE_UPDATED(id);
    await this.redisService.invalidate(keys);
    this.logger.log(`Invalidated cache for user: ${id}`);
  }

  async updatePreferredTime(
    userId: string,
    preferredTime: string,
  ): Promise<PublicUserRecord | null> {
    const db = await this.db();
    const result = await db.user.update({
      where: { id: userId },
      data: { preferredTime },
      select: publicUserSelect,
    });
    if (result) await this.invalidateCache(userId);
    return result;
  }

  async getUserStatistics(userId: string) {
    return this.redisService.getOrSet(
      this.getCacheKey('stats', userId),
      () => this.fetchUserStatistics(userId),
      USER_CACHE_CONFIG.STATISTICS,
      parseUserStatisticsCache,
    );
  }

  private async fetchUserStatistics(userId: string) {
    const db = await this.db();
    const baseWhere = {
      isDeleted: false,
      OR: [{ accountCreatorId: userId }],
    };
    const totalChildren = await db.user.count({ where: baseWhere });
    return { totalChildren };
  }
}
