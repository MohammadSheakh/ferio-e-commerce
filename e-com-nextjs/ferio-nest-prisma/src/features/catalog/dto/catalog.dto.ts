import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const productStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
const mediaTypes = ['IMAGE', 'VIDEO'] as const;
const productConditions = ['NEW', 'SECOND_HAND'] as const;
const productConditionGrades = ['LIKE_NEW', 'GOOD', 'FAIR'] as const;
const inventoryAdjustmentReasons = [
  'STOCK_COUNT_CORRECTION',
  'PURCHASE_RECEIPT',
  'CUSTOMER_RETURN',
  'DAMAGE_WRITE_OFF',
  'OTHER',
] as const;

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductMediaDto {
  @IsUrl({ require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  altText?: string;

  @IsOptional()
  @IsIn(mediaTypes)
  type?: (typeof mediaTypes)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  @MaxLength(64)
  sku: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class CreateBrandDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BrandQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class ProductFeatureInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProductSpecificationInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  group?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  value: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProductYoutubeReviewInputDto {
  @IsString()
  youtubeUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewerName?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15000)
  description: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsIn(productStatuses)
  status?: (typeof productStatuses)[number];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  codAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnNote?: string;

  @IsOptional()
  @IsIn(productConditions)
  condition?: (typeof productConditions)[number];

  @IsOptional()
  @IsIn(productConditionGrades)
  conditionGrade?: (typeof productConditionGrades)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMediaDto)
  media?: CreateProductMediaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductYoutubeReviewInputDto)
  youtubeReviews?: ProductYoutubeReviewInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFeatureInputDto)
  features?: ProductFeatureInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationInputDto)
  specifications?: ProductSpecificationInputDto[];
}

export class UpdateProductVariantDto extends CreateProductVariantDto {
  @IsOptional()
  @IsString()
  id?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(15000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  codAvailable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnNote?: string;

  @IsOptional()
  @IsIn(productConditions)
  condition?: (typeof productConditions)[number];

  @IsOptional()
  @IsIn(productConditionGrades)
  conditionGrade?: (typeof productConditionGrades)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMediaDto)
  media?: CreateProductMediaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductYoutubeReviewInputDto)
  youtubeReviews?: ProductYoutubeReviewInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductFeatureInputDto)
  features?: ProductFeatureInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationInputDto)
  specifications?: ProductSpecificationInputDto[];
}

export class ProductQueryDto {
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
  limit = 24;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  featured?: string;

  @IsOptional()
  @IsIn(productConditions)
  condition?: (typeof productConditions)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: string;

  @IsOptional()
  @IsIn(['newest', 'price-asc', 'price-desc', 'name-asc'])
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  attributeKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  attributeValue?: string;
}

export class AdminProductQueryDto extends ProductQueryDto {
  @IsOptional()
  @IsIn(productStatuses)
  status?: (typeof productStatuses)[number];
}

export class UpdateProductStatusDto {
  @IsIn(productStatuses)
  status: (typeof productStatuses)[number];
}

export class AdjustInventoryDto {
  @Type(() => Number)
  @IsInt()
  quantityDelta: number;

  @IsIn(inventoryAdjustmentReasons)
  adjustmentReason: (typeof inventoryAdjustmentReasons)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  evidenceUrl?: string;

  @IsOptional()
  @IsISO8601()
  effectiveAt?: string;
}

export class InventoryQueryDto {
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
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  lowStock?: string;
}
