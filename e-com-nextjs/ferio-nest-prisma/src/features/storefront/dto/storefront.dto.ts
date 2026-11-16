import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CollectionRuleField,
  CollectionRuleOperator,
  CollectionType,
  ProductSourceType,
  StorefrontSectionType,
} from '@prisma/client';

export class CollectionRuleDto {
  @ApiProperty({ enum: CollectionRuleField })
  @IsEnum(CollectionRuleField)
  field: CollectionRuleField;

  @ApiProperty({ enum: CollectionRuleOperator })
  @IsEnum(CollectionRuleOperator)
  operator: CollectionRuleOperator;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerImageUrl?: string;

  @ApiPropertyOptional({ enum: CollectionType, default: CollectionType.MANUAL })
  @IsEnum(CollectionType)
  @IsOptional()
  type?: CollectionType;

  @ApiPropertyOptional({ enum: ['ALL', 'ANY'], default: 'ALL' })
  @IsString()
  @IsOptional()
  matchMode?: 'ALL' | 'ANY';

  @ApiPropertyOptional({ type: [CollectionRuleDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CollectionRuleDto)
  rules?: CollectionRuleDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  productIds?: string[];
}

export class UpdateCollectionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerImageUrl?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['ALL', 'ANY'] })
  @IsString()
  @IsOptional()
  matchMode?: 'ALL' | 'ANY';

  @ApiPropertyOptional({ type: [CollectionRuleDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CollectionRuleDto)
  rules?: CollectionRuleDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  productIds?: string[];
}

export class CollectionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CollectionType })
  @IsOptional()
  @IsEnum(CollectionType)
  type?: CollectionType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SectionSettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ default: 4 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(6)
  columns?: number;

  @ApiPropertyOptional({ default: 8 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(36)
  productLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  showViewAll?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  viewAllUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  hideWhenEmpty?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  customConfig?: Record<string, unknown>;
}

export class SectionDataSourceDto {
  @ApiProperty({ enum: ProductSourceType })
  @IsEnum(ProductSourceType)
  type: ProductSourceType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  collectionId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandId?: string;
}

export class UpdateStorefrontSectionItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ enum: StorefrontSectionType })
  @IsEnum(StorefrontSectionType)
  type: StorefrontSectionType;

  @ApiProperty({ default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ default: 0 })
  @IsInt()
  sortOrder: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dataSource?: Record<string, any>;
}

export class SaveDraftSectionsDto {
  @ApiProperty({ type: [UpdateStorefrontSectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStorefrontSectionItemDto)
  sections: UpdateStorefrontSectionItemDto[];
}

export class PublishStorefrontDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  changeSummary?: string;
}

export class RollbackStorefrontDto {
  @ApiProperty()
  @IsInt()
  versionNumber: number;
}

