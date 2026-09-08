import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import type { OrganizationStatus } from '../generated/platform-client';

const ORGANIZATION_STATUSES: OrganizationStatus[] = [
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'PROVISIONING_FAILED',
  'CLOSURE_PENDING',
  'CLOSED',
  'ARCHIVED',
];

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsEmail()
  @MaxLength(160)
  ownerEmail!: string;
}

export class TransitionOrganizationDto {
  @IsIn(ORGANIZATION_STATUSES)
  status!: OrganizationStatus;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason?: string;
}

export class ProvisionOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  idempotencyKey?: string;
}

export class InitiateClosureDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason?: string;
}

export class FinalizeClosureDto {
  @IsBoolean()
  retentionAcknowledged!: boolean;

  @IsOptional()
  @IsBoolean()
  overrideRetentionPeriod?: boolean;
}
