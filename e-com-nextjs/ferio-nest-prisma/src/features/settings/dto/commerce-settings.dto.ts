import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCommerceSettingsDto {
  @ApiPropertyOptional({ example: 'Ferio' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+8801712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  supportPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  supportEmail?: string | null;

  @ApiPropertyOptional({ enum: ['BDT'] })
  @IsOptional()
  @IsIn(['BDT'])
  currency?: 'BDT';

  @ApiPropertyOptional({ example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ example: 'FER' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,8}$/)
  orderPrefix?: string;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  defaultReturnWindowDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  prepaidEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serviceBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  warrantyClaimsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  storefrontAnalyticsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  purchaseActivityEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  purchaseHistoryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  purchaseActivityShowDistrict?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  purchaseActivityShowArea?: boolean;

  @ApiPropertyOptional({ minimum: 2000, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(10000)
  purchaseActivityDurationMs?: number;

  @ApiPropertyOptional({ minimum: 6, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(120)
  purchaseActivityIntervalSeconds?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  purchaseActivityMaxAgeDays?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  purchaseActivityExcludedProductIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  categoryTopNavEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  categorySideNavEnabled?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  termsUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  privacyUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  returnPolicyUrl?: string | null;
}
