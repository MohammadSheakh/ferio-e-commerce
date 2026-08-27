import { StorefrontAnalyticsEventType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ enum: StorefrontAnalyticsEventType })
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
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  searchResultCount?: number;

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
