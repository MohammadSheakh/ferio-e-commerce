import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BackupEvidenceScope,
  BackupEvidenceStatus,
} from '../generated/platform-client';
import { PlatformPrismaService } from '../platform-prisma.service';

const DATABASE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SAFE_DETAIL_KEYS = new Set(['source', 'actorId']);

export interface RecordBackupEvidenceInput {
  scope: BackupEvidenceScope;
  organizationId?: string;
  databaseName: string;
  artifactName: string;
  checksum: string;
  schemaVersion?: string;
  status?: BackupEvidenceStatus;
  completedAt: Date;
  restoreVerifiedAt?: Date;
  protectedAt?: Date;
  detail?: Record<string, string>;
}

/**
 * Secret-free control-plane ledger for backup and restore evidence.
 * Database credentials, URLs, object-store keys, and customer data never enter
 * this record. Provider scheduling and the actual restore drill remain
 * deployment-owned operations.
 */
@Injectable()
export class BackupEvidenceService {
  constructor(private readonly platform: PlatformPrismaService) {}

  async record(input: RecordBackupEvidenceInput) {
    this.validate(input);
    return this.platform.client.backupEvidence.create({
      data: {
        scope: input.scope,
        organizationId: input.organizationId,
        databaseName: input.databaseName,
        artifactName: input.artifactName,
        checksum: input.checksum.toLowerCase(),
        schemaVersion: input.schemaVersion,
        status: input.status ?? BackupEvidenceStatus.VERIFIED,
        completedAt: input.completedAt,
        restoreVerifiedAt: input.restoreVerifiedAt,
        protectedAt: input.protectedAt,
        detail: input.detail
          ? Object.fromEntries(
              Object.entries(input.detail).filter(([key]) =>
                SAFE_DETAIL_KEYS.has(key),
              ),
            )
          : undefined,
      },
      select: {
        id: true,
        scope: true,
        organizationId: true,
        databaseName: true,
        artifactName: true,
        checksum: true,
        schemaVersion: true,
        status: true,
        completedAt: true,
        restoreVerifiedAt: true,
        protectedAt: true,
        createdAt: true,
      },
    });
  }

  async latest(scope: BackupEvidenceScope, organizationId?: string) {
    return this.platform.client.backupEvidence.findFirst({
      where: {
        scope,
        organizationId: organizationId ?? undefined,
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        scope: true,
        organizationId: true,
        databaseName: true,
        artifactName: true,
        checksum: true,
        schemaVersion: true,
        status: true,
        completedAt: true,
        restoreVerifiedAt: true,
        protectedAt: true,
        createdAt: true,
      },
    });
  }

  private validate(input: RecordBackupEvidenceInput): void {
    if (input.scope === BackupEvidenceScope.TENANT && !input.organizationId) {
      throw new BadRequestException('BACKUP_EVIDENCE_TENANT_REQUIRED');
    }
    if (
      input.scope === BackupEvidenceScope.CONTROL_PLANE &&
      input.organizationId
    ) {
      throw new BadRequestException(
        'BACKUP_EVIDENCE_CONTROL_PLANE_ORG_FORBIDDEN',
      );
    }
    if (!DATABASE_NAME_PATTERN.test(input.databaseName)) {
      throw new BadRequestException('BACKUP_EVIDENCE_DATABASE_INVALID');
    }
    if (
      !input.artifactName ||
      input.artifactName.includes('/') ||
      input.artifactName.includes('\\')
    ) {
      throw new BadRequestException('BACKUP_EVIDENCE_ARTIFACT_INVALID');
    }
    if (!SHA256_PATTERN.test(input.checksum)) {
      throw new BadRequestException('BACKUP_EVIDENCE_CHECKSUM_INVALID');
    }
    if (Number.isNaN(input.completedAt.getTime())) {
      throw new BadRequestException('BACKUP_EVIDENCE_COMPLETION_TIME_INVALID');
    }
  }
}
