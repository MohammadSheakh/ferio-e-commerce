import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const returnReasons = [
  'DAMAGED',
  'DEFECTIVE',
  'WRONG_ITEM',
  'NOT_AS_DESCRIBED',
  'SIZE_OR_FIT',
  'CHANGED_MIND',
  'OTHER',
] as const;
const requestedResolutions = [
  'REFUND',
  'REPLACEMENT',
  'EXCHANGE',
  'OTHER',
] as const;
const requestChannels = ['CUSTOMER', 'SUPPORT', 'ADMIN'] as const;
const reviewDecisions = ['APPROVE', 'PARTIAL_APPROVE', 'REJECT'] as const;
const returnStatuses = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'CANCELLED',
  'INSPECTED',
] as const;
const itemConditions = [
  'SEALED',
  'UNUSED',
  'OPENED',
  'USED',
  'DAMAGED',
  'WRONG_ITEM',
  'OTHER',
] as const;
const inventoryDispositions = [
  'SELLABLE',
  'DAMAGED',
  'QUARANTINED',
  'LOST',
] as const;
const inspectionDecisions = ['ACCEPT', 'PARTIAL_ACCEPT', 'REJECT'] as const;
const finalResolutions = [
  'REFUND',
  'REPLACEMENT',
  'EXCHANGE',
  'REJECTED',
  'OTHER',
] as const;

export class CreateReturnItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  orderItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class CreateReturnCaseDto {
  @IsIn(returnReasons)
  reason: (typeof returnReasons)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description: string;

  @IsIn(requestedResolutions)
  requestedResolution: (typeof requestedResolutions)[number];

  @IsIn(requestChannels)
  requestChannel: (typeof requestChannels)[number];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_protocol: true }, { each: true })
  evidenceUrls?: string[];
}

export class ReviewReturnItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  returnItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  approvedQuantity: number;
}

export class ReviewReturnCaseDto {
  @IsIn(reviewDecisions)
  decision: (typeof reviewDecisions)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReviewReturnItemDto)
  items?: ReviewReturnItemDto[];
}

export class InspectReturnItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  returnItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  receivedQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  acceptedQuantity: number;

  @IsIn(itemConditions)
  condition: (typeof itemConditions)[number];

  @IsIn(inventoryDispositions)
  inventoryDisposition: (typeof inventoryDispositions)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class InspectReturnCaseDto {
  @IsIn(inspectionDecisions)
  decision: (typeof inspectionDecisions)[number];

  @IsIn(finalResolutions)
  finalResolution: (typeof finalResolutions)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InspectReturnItemDto)
  items: InspectReturnItemDto[];
}

export class ReturnCaseQueryDto {
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
  @IsIn(returnStatuses)
  status?: (typeof returnStatuses)[number];
}
