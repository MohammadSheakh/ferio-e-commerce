import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Settings } from '@prisma/client';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/redis';
import {
  PaginateOptions,
  PaginateResult,
  CursorPaginateOptions,
  CursorPaginateResult,
  cleanFilters,
  parseSort,
  buildProjection,
} from '@app/common';
import { SettingsType } from '../constants/settings.constants';
import { CreateOrUpdateSettingsDto } from '../dto/settings.dto';
import { SETTINGS_CACHE_CONFIG } from '../constants/settings.cache.constants';
import type { UserPayload } from '@app/common';
import { AuditService } from '../../audit/services/audit.service';
import { Optional } from '@nestjs/common';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { tryGetTenantContext } from '../../../tenancy/tenant-context';
import type { PrismaClient } from '@prisma/client';
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {
    this.logger.log('✅ Settings Service (Prisma + Cache) initialized');
  }

  /**
   * MT-7/MT-8: cache keys carry the resolved tenant identity. Identical
   * settings types across tenants can never share a cache entry, and
   * invalidation inside the same request context always matches.
   */
  private getCacheKey(type: string): string {
    const orgId = tryGetTenantContext()?.organizationId ?? 'legacy';
    return `${SETTINGS_CACHE_CONFIG.PREFIX}:${orgId}:${type}`;
  }

  /** Tenant client inside resolved requests; legacy DB otherwise (MT-7). */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  async createOrUpdateSettings(
    type: SettingsType,
    dto: CreateOrUpdateSettingsDto,
    actor: UserPayload,
  ) {
    this.logger.log(`Creating/updating settings for type: ${type}`);

    const updateData: Prisma.SettingsUpdateInput = {};
    if (dto.details !== undefined) {
      updateData.details = dto.details;
    }
    if (dto.introductionVideo !== undefined) {
      updateData.introductionVideo =
        dto.introductionVideo as Prisma.InputJsonValue;
    }

    const db = await this.db();
    const result: Settings = await db.$transaction(async (transaction) => {
      const previous = await transaction.settings.findUnique({
        where: { type },
      });
      const updated = await transaction.settings.upsert({
        where: { type },
        update: updateData,
        create: {
          type,
          details: dto.details || '',
        },
      });
      await this.audit.record(
        {
          action: previous ? 'SETTINGS_UPDATED' : 'SETTINGS_CREATED',
          entityType: 'Settings',
          entityId: updated.id,
          actor,
          previousValue: previous,
          newValue: updated,
        },
        transaction,
      );
      return updated;
    });

    // Invalidate cache
    await this.invalidateCache(type);
    return result;
  }

  async getSettingsByType(type: SettingsType) {
    return this.redisService.getOrSet(
      this.getCacheKey(type),
      () => this.fetchSettings(type),
      SETTINGS_CACHE_CONFIG.TTL,
    );
  }

  private async fetchSettings(type: SettingsType) {
    const db = await this.db();
    const settings = await db.settings.findUnique({ where: { type } });
    if (!settings) return [];
    return [settings];
  }

  async getAllSettings() {
    const db = await this.db();
    return db.settings.findMany({ orderBy: { type: 'asc' } });
  }

  async getAllWithPagination(
    filters: Record<string, unknown> = {},
    options: PaginateOptions,
    include?: Record<string, unknown>,
    select?: Record<string, boolean>,
  ): Promise<PaginateResult<Settings>> {
    const db = await this.db();
    const page = Number(options.page) > 0 ? Number(options.page) : 1;
    const limit = Number(options.limit) || 10;
    const where = cleanFilters(filters) as Prisma.SettingsWhereInput;
    const orderBy = parseSort(
      options.sortBy,
      'type',
    ) as Prisma.SettingsOrderByWithRelationInput;

    const [docs, total] = await Promise.all([
      db.settings.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        ...buildProjection(include, select),
      }),
      db.settings.count({ where }),
    ]);

    return {
      docs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllWithPaginationCursor(
    filters: Record<string, unknown> = {},
    options: CursorPaginateOptions,
    include?: Record<string, unknown>,
    select?: Record<string, boolean>,
  ): Promise<CursorPaginateResult<Settings>> {
    const db = await this.db();
    const limit = Number(options.limit) || 10;
    const where = cleanFilters(filters) as Prisma.SettingsWhereInput;

    // For cursor pagination, sortBy defaults to 'id' or another unique field to avoid duplicates.
    // If not specified, we sort by 'id' ascending as a reliable cursor.
    const orderBy = parseSort(
      options.sortBy,
      'id',
    ) as Prisma.SettingsOrderByWithRelationInput;

    const take = limit + 1;
    const prismaOptions: Prisma.SettingsFindManyArgs = {
      where,
      take,
      orderBy,
      ...buildProjection(include, select),
    };

    if (options.cursor) {
      prismaOptions.cursor = { id: options.cursor };
      prismaOptions.skip = 1; // Skip the cursor element itself
    }

    const docs = await db.settings.findMany(prismaOptions);

    let nextCursor: string | undefined = undefined;
    let hasNextPage = false;

    if (docs.length > limit) {
      hasNextPage = true;
      const nextItem = docs.pop();
      nextCursor = nextItem?.id;
    }

    return {
      docs,
      nextCursor,
      hasNextPage,
    };
  }

  async deleteSettingsByType(
    type: SettingsType,
    actor: UserPayload,
  ): Promise<void> {
    const db = await this.db();
    await db.$transaction(async (transaction) => {
      const previous = await transaction.settings.delete({ where: { type } });
      await this.audit.record(
        {
          action: 'SETTINGS_DELETED',
          entityType: 'Settings',
          entityId: previous.id,
          actor,
          previousValue: previous,
        },
        transaction,
      );
    });
    await this.invalidateCache(type);
  }

  private async invalidateCache(type: string): Promise<void> {
    const keys =
      SETTINGS_CACHE_CONFIG.INVALIDATION_PATTERNS.SETTINGS_UPDATED(type);
    await this.redisService.invalidate(keys);
  }
}
