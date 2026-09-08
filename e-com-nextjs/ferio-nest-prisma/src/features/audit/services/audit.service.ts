import { Injectable } from '@nestjs/common';
import { AuditSource, Prisma, type PrismaClient } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { getCorrelationId } from '@app/common';
import { PrismaService } from '@app/database';
import { tryGetTenantContext } from '../../../tenancy/context/tenant-context';
import {
  resolveTenantDatabase,
  TenantDbService,
} from '../../../tenancy/services/tenant-db.service';
import { AuditLogQueryDto } from '../dto/audit.dto';
import { safeAuditJson } from '../utils/audit.util';

type AuditClient = Prisma.TransactionClient | PrismaService;

export type RecordAuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  actor?: Pick<UserPayload, 'userId' | 'role'>;
  source?: AuditSource;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb?: TenantDbService,
  ) {}

  async record(input: RecordAuditInput, client?: AuditClient) {
    const db = client ?? (await this.databaseForRequest());
    const tenant = tryGetTenantContext();
    return db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actor?.userId,
        actorRole: input.actor?.role,
        source: input.source ?? 'ADMIN_API',
        previousValue: safeAuditJson(input.previousValue),
        newValue: safeAuditJson(input.newValue),
        metadata: safeAuditJson({
          ...(isRecord(input.metadata) ? input.metadata : {}),
          context: {
            correlationId: tenant?.correlationId ?? getCorrelationId(),
            organizationId: tenant?.organizationId,
            tenantDatabaseId: tenant?.tenantDatabaseId,
            domainId: tenant?.domainId,
            hostname: tenant?.hostname,
          },
        }),
      },
    });
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const db = await this.databaseForRequest();
    const where: Prisma.AuditLogWhereInput = {
      action: query.action
        ? {
            contains: query.action.normalize('NFKC').trim(),
            mode: 'insensitive',
          }
        : undefined,
      entityType: query.entityType
        ? {
            equals: query.entityType.normalize('NFKC').trim(),
            mode: 'insensitive',
          }
        : undefined,
      entityId: query.entityId
        ? {
            contains: query.entityId.normalize('NFKC').trim(),
            mode: 'insensitive',
          }
        : undefined,
      actorId: query.actorId,
      source: query.source,
    };
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where }),
    ]);
    const totalPages = Math.ceil(total / query.limit) || 1;
    return {
      items,
      results: items,
      data: items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  private async databaseForRequest(): Promise<PrismaClient> {
    return resolveTenantDatabase(this.tenantDb, this.prisma);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
