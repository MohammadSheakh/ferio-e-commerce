import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsIn,
  IsOptional,
  IsNumber,
  IsString,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CheckoutPreviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @IsOptional()
  @IsIn(['HOME_DELIVERY', 'STORE_PICKUP'])
  deliveryMethod?: 'HOME_DELIVERY' | 'STORE_PICKUP' = 'HOME_DELIVERY';

  @IsOptional()
  @IsString()
  pickupStoreId?: string;

  @IsOptional()
  @IsString()
  preferredPickupDate?: string;

  @IsOptional()
  @IsString()
  preferredPickupSlot?: string;

  @IsIn(['COD', 'PREPAID', 'PAY_AT_STORE', 'WALLET'])
  paymentMethod: 'COD' | 'PREPAID' | 'PAY_AT_STORE' | 'WALLET' = 'COD';

  @ValidateIf((dto: CheckoutPreviewDto) => dto.paymentMethod === 'PREPAID')
  @IsIn(['SSLCOMMERZ', 'AAMARPAY'])
  paymentProvider?: 'SSLCOMMERZ' | 'AAMARPAY';
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  area: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detailedAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsBoolean()
  purchaseActivityConsent?: boolean;

  @IsBoolean()
  @Equals(true)
  termsAccepted: true;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  campaign?: string;
}

export class CreateDeliveryZoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(100, { each: true })
  districts: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDeliveryThreshold?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(100, { each: true })
  districts?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDeliveryThreshold?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
