import { Injectable } from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { toPlatformJsonInput } from '../utils/json-input.util';

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
        previousValue: toPlatformJsonInput(input.previousValue),
        newValue: toPlatformJsonInput(input.newValue),
        metadata: toPlatformJsonInput(input.metadata),
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
