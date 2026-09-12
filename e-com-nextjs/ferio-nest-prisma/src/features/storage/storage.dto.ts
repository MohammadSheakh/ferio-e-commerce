import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export const ADMIN_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const ADMIN_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export class PresignPutDto {
  @IsString()
  @MaxLength(80)
  folder!: string;

  @IsString()
  @MaxLength(180)
  filename!: string;

  @IsIn(ADMIN_UPLOAD_CONTENT_TYPES)
  contentType!: (typeof ADMIN_UPLOAD_CONTENT_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_UPLOAD_MAX_BYTES)
  sizeBytes!: number;
}

export class FinalizePutDto {
  @IsString()
  @MaxLength(512)
  key!: string;

  @IsIn(ADMIN_UPLOAD_CONTENT_TYPES)
  contentType!: (typeof ADMIN_UPLOAD_CONTENT_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_UPLOAD_MAX_BYTES)
  sizeBytes!: number;
}
