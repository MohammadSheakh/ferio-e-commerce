import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BackupEvidenceScope,
  BackupEvidenceStatus,
} from '../generated/platform-client';

export class RecordBackupEvidenceDto {
  @IsEnum(BackupEvidenceScope)
  scope!: BackupEvidenceScope;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  organizationId?: string;

  @IsString()
  @MaxLength(63)
  databaseName!: string;

  @IsString()
  @MaxLength(255)
  artifactName!: string;

  @IsString()
  @MaxLength(64)
  checksum!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  schemaVersion?: string;

  @IsOptional()
  @IsEnum(BackupEvidenceStatus)
  status?: BackupEvidenceStatus;

  @IsISO8601()
  completedAt!: string;

  @IsOptional()
  @IsISO8601()
  restoreVerifiedAt?: string;

  @IsOptional()
  @IsISO8601()
  protectedAt?: string;
}
