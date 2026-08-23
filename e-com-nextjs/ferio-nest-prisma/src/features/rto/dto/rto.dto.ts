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

const reasons = [
  'CUSTOMER_UNREACHABLE',
  'CUSTOMER_REFUSED',
  'ADDRESS_ISSUE',
  'DELIVERY_ATTEMPTS_EXHAUSTED',
  'COURIER_ISSUE',
  'DAMAGED_IN_TRANSIT',
  'OTHER',
] as const;

export class InspectRtoItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  rtoItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  receivedQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sellableQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  damagedQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  lostQuantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class InspectRtoCaseDto {
  @IsIn(reasons)
  reason: (typeof reasons)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reasonNote: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  outboundCourierCost: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  returnCourierCost: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  otherCost: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InspectRtoItemDto)
  items: InspectRtoItemDto[];
}
