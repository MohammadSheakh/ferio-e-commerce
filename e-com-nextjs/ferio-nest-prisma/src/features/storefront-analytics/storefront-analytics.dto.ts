import { StorefrontAnalyticsEventType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStorefrontAnalyticsEventDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  anonymousId!: string;

  @IsEnum(StorefrontAnalyticsEventType)
  type!: StorefrontAnalyticsEventType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  searchTerm?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^\/[^\s]*$/)
  path?: string;
}
