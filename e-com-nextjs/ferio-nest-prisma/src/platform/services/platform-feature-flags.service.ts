import { ConflictException, Injectable } from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';
import { PLATFORM_FEATURE_FLAG_KEY } from '../dto/platform-feature-flag.dto';

export interface UpsertPlatformFeatureFlagInput {
  key: string;
  enabled: boolean;
  note?: string | null;
  actorId?: string;
}

@Injectable()
export class PlatformFeatureFlagsService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async list() {
    return this.platform.client.platformFeatureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async upsert(input: UpsertPlatformFeatureFlagInput) {
    const key = input.key.trim().toLowerCase();
    if (!PLATFORM_FEATURE_FLAG_KEY.test(key)) {
      throw new ConflictException('PLATFORM_FEATURE_FLAG_KEY_INVALID');
    }
    const note = input.note?.trim() || null;
    const existing = await this.platform.client.platformFeatureFlag.findUnique({
      where: { key },
    });
    const flag = await this.platform.client.platformFeatureFlag.upsert({
      where: { key },
      create: { key, enabled: input.enabled, note },
      update: { enabled: input.enabled, note },
    });

    await this.audit.record({
      action: existing
        ? 'PLATFORM_FEATURE_FLAG_UPDATED'
        : 'PLATFORM_FEATURE_FLAG_CREATED',
      entityType: 'PlatformFeatureFlag',
      entityId: flag.id,
      actorId: input.actorId,
      previousValue: existing,
      newValue: flag,
    });
    return flag;
  }
}
