import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const messageStatuses = [
  'QUEUED',
  'PROCESSING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'BLOCKED',
] as const;

export class TransactionalMessageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  @IsOptional()
  @IsIn(messageStatuses)
  status?: (typeof messageStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

const messageChannels = ['WHATSAPP', 'SMS', 'EMAIL'] as const;

export class UpdateMessagingProviderConfigDto {
  @IsString()
  @MaxLength(80)
  provider!: string;

  @IsObject()
  credentials!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateMessagingPolicyDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(messageChannels, { each: true })
  channelPriority?: (typeof messageChannels)[number][];

  @IsOptional()
  @IsBoolean()
  fallbackOnDefinitiveFailure?: boolean;
}

export class UpdateMessageTemplateDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subjectTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bodyTemplate?: string;
}
