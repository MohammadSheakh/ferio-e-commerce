import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Settings } from '@prisma/client';
import { PrismaService } from '@app/database';
import { RedisService } from '@app/redis';
import {
  PaginateOptions,
  PaginateResult,
  CursorPaginateOptions,
  CursorPaginateResult,
  cleanFilters,
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
import { toTenantJsonInput } from '../../../core/database/json-input.util';

type SettingsSortField = 'id' | 'type' | 'createdAt' | 'updatedAt';

const SETTINGS_SORT_FIELDS: readonly SettingsSortField[] = [
  'id',
  'type',
  'createdAt',
  'updatedAt',
];

function isSettingsType(value: unknown): value is SettingsType {
  return Object.values(SettingsType).some((type) => type === value);
}

function isSettingsSortField(value: string): value is SettingsSortField {
  return (SETTINGS_SORT_FIELDS as readonly string[]).includes(value);
}

function isSettingsCacheItem(value: unknown): value is Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.type === 'string';
}

function parseSettingsCache(value: unknown): Settings[] | undefined {
  return Array.isArray(value) && value.every(isSettingsCacheItem)
    ? value
    : undefined;
}

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
    return this.tenantDb ? this.tenantDb.getOrLegacy(this.prisma) : this.prisma;
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
      updateData.introductionVideo = toTenantJsonInput(dto.introductionVideo);
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
      parseSettingsCache,
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

  private settingsWhere(
    filters: Record<string, unknown>,
  ): Prisma.SettingsWhereInput {
    const value = cleanFilters(filters).type;
    return isSettingsType(value) ? { type: value } : {};
  }

  private settingsOrderBy(
    sortBy: string | undefined,
    fallback: SettingsSortField,
  ): Prisma.SettingsOrderByWithRelationInput {
    const descending = sortBy?.startsWith('-') ?? false;
    const requested = sortBy?.replace(/^-/, '') ?? fallback;
    const field = isSettingsSortField(requested) ? requested : fallback;
    return { [field]: descending ? 'desc' : 'asc' };
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
    const where = this.settingsWhere(filters);
    const orderBy = this.settingsOrderBy(options.sortBy, 'type');

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
    const where = this.settingsWhere(filters);

    // For cursor pagination, sortBy defaults to 'id' or another unique field to avoid duplicates.
    // If not specified, we sort by 'id' ascending as a reliable cursor.
    const orderBy = this.settingsOrderBy(options.sortBy, 'id');

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
