import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsHash,
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

export class CreateSettlementItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  shipmentId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  collectedAmount: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  courierFee: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  otherDeduction: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateCourierSettlementDto {
  @IsIn(['PATHAO', 'STEADFAST'])
  provider: 'PATHAO' | 'STEADFAST';

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  providerSettlementReference: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  bankReference: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  remittedAmount: number;

  @IsDateString()
  settledAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateSettlementItemDto)
  items: CreateSettlementItemDto[];
}

export class ImportSettlementReportRowDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  providerRowReference: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  trackingNumber: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  collectedAmount: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  courierFee: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  otherDeduction: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SettlementCsvEvidenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsHash('sha256')
  sourceChecksum: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1_100_000)
  content: string;
}

export class ImportSettlementReportDto {
  @IsIn(['PATHAO', 'STEADFAST'])
  provider: 'PATHAO' | 'STEADFAST';

  @IsIn(['API', 'CSV', 'MANUAL_JSON'])
  source: 'API' | 'CSV' | 'MANUAL_JSON';

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  providerReportReference: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  bankReference: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  remittedAmount: number;

  @IsDateString()
  settledAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supersedesImportId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SettlementCsvEvidenceDto)
  csvEvidence?: SettlementCsvEvidenceDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportSettlementReportRowDto)
  rows: ImportSettlementReportRowDto[];
}

export class PreflightSettlementReportDto {
  @IsIn(['PATHAO', 'STEADFAST'])
  provider: 'PATHAO' | 'STEADFAST';

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1_100_000)
  content: string;
}
