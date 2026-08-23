import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const warrantyStatuses = [
  'SUBMITTED',
  'PRODUCT_RECEIVED',
  'UNDER_DIAGNOSIS',
  'SENT_TO_BRAND',
  'RECEIVED_FROM_BRAND',
  'REPAIRED',
  'RESOLVED',
  'REJECTED',
] as const;

class WarrantyEvidenceDto {
  @IsString() @MinLength(8) imageUrl: string;
  @IsOptional() @IsString() publicId?: string;
}

export class WarrantyClaimQueryDto {
  @IsOptional()
  @IsIn(warrantyStatuses)
  status?: (typeof warrantyStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
}
export class VerifyWarrantyOrderDto {
  @IsString() reference: string;
  @IsString() phone: string;
}
export class CreateWarrantyClaimDto extends VerifyWarrantyOrderDto {
  @IsString() orderItemId: string;
  @IsString() @MinLength(20) @MaxLength(3000) issueDescription: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => WarrantyEvidenceDto)
  evidence: WarrantyEvidenceDto[];
}
export class UpdateWarrantyClaimDto {
  @IsIn([
    'PRODUCT_RECEIVED',
    'UNDER_DIAGNOSIS',
    'SENT_TO_BRAND',
    'RECEIVED_FROM_BRAND',
    'REPAIRED',
    'RESOLVED',
    'REJECTED',
  ])
  status:
    | 'PRODUCT_RECEIVED'
    | 'UNDER_DIAGNOSIS'
    | 'SENT_TO_BRAND'
    | 'RECEIVED_FROM_BRAND'
    | 'REPAIRED'
    | 'RESOLVED'
    | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsString() @MaxLength(1000) rejectionReason?: string;
}
