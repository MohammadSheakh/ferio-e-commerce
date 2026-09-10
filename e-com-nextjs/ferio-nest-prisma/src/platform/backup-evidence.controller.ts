import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  PlatformAuthGuard,
  PlatformPermissions,
  PLATFORM_PERMISSION,
} from './guards/platform-auth.guard';
import type { PlatformRequest } from './platform-request.type';
import { RecordBackupEvidenceDto } from './dto/backup-evidence.dto';
import { BackupEvidenceService } from './services/backup-evidence.service';

@Controller('platform/operations')
@UseGuards(PlatformAuthGuard)
export class BackupEvidenceController {
  constructor(private readonly evidence: BackupEvidenceService) {}

  @Post('backup-evidence')
  @PlatformPermissions(PLATFORM_PERMISSION.BACKUP_EVIDENCE_WRITE)
  record(
    @Body() body: RecordBackupEvidenceDto,
    @Req() request: PlatformRequest,
  ) {
    return this.evidence.record({
      scope: body.scope,
      organizationId: body.organizationId,
      databaseName: body.databaseName,
      artifactName: body.artifactName,
      checksum: body.checksum,
      schemaVersion: body.schemaVersion,
      status: body.status,
      completedAt: new Date(body.completedAt),
      restoreVerifiedAt: body.restoreVerifiedAt
        ? new Date(body.restoreVerifiedAt)
        : undefined,
      protectedAt: body.protectedAt ? new Date(body.protectedAt) : undefined,
      detail: {
        actorId: request.platformPrincipal?.platformUserId ?? 'unknown',
      },
    });
  }
}
