import { Injectable } from '@nestjs/common';
import type { PlatformPrismaService } from '../platform-prisma.service';

export interface RecordAuditInput {
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  source?: string;
}

/** Append-only platform audit trail. Normal flows never update or delete rows. */
@Injectable()
export class PlatformAuditService {
  constructor(private readonly platform: PlatformPrismaService) {}

  record(input: RecordAuditInput) {
    return this.platform.client.platformAuditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        source: input.source ?? 'PLATFORM_ADMIN',
        previousValue: (input.previousValue ?? undefined) as never,
        newValue: (input.newValue ?? undefined) as never,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  }

  async list(entityType: string, entityId?: string, take = 50) {
    return this.platform.client.platformAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
    });
  }
}
