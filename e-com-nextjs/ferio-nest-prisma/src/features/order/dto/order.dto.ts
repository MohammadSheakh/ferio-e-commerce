import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const orderStatuses = [
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'CANCELLED',
  'DELIVERED',
  'COMPLETED',
] as const;
const paymentStatuses = [
  'UNPAID',
  'PAID',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;
const verificationModes = ['ALWAYS', 'ABOVE_AMOUNT', 'NEVER'] as const;
const fulfillmentStatuses = [
  'UNFULFILLED',
  'READY_FOR_FULFILLMENT',
  'PICKING',
  'PACKED',
  'QUALITY_CHECKED',
  'READY_FOR_HANDOVER',
  'HANDED_OVER',
  'CANCELLED',
  'FULFILLED',
] as const;
const fulfillmentExceptionTypes = [
  'SHORTAGE',
  'SUBSTITUTION',
  'OTHER',
] as const;

export class PlaceOrderDto {
  @IsIn(['COD', 'PREPAID', 'PAY_AT_STORE'])
  paymentMethod: 'COD' | 'PREPAID' | 'PAY_AT_STORE';
}

export class OrderQueryDto {
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
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(orderStatuses)
  status?: (typeof orderStatuses)[number];

  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: (typeof paymentStatuses)[number];

  @IsOptional()
  @IsIn(fulfillmentStatuses)
  fulfillmentStatus?: (typeof fulfillmentStatuses)[number];

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class CancelOrderDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class ConfirmOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateCodPolicyDto {
  @IsIn(verificationModes)
  mode: (typeof verificationModes)[number];

  @ValidateIf((dto: UpdateCodPolicyDto) => dto.mode === 'ABOVE_AMOUNT')
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountThreshold?: number | null;
}

export class UpdateFulfillmentDto {
  @IsIn(fulfillmentStatuses)
  status: (typeof fulfillmentStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateFulfillmentExceptionDto {
  @IsIn(fulfillmentExceptionTypes)
  type: (typeof fulfillmentExceptionTypes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderItemId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description: string;
}

export class ResolveFulfillmentExceptionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  resolution: string;
}

export class TrackOrderDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  reference: string;

  @IsString()
  @MinLength(11)
  @MaxLength(20)
  phone: string;
}

export class ScheduleStorePickupDto {
  @IsOptional()
  @IsString()
  pickupScheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredPickupSlot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerPickupNotes?: string;
}

export class UpdateStorePickupStatusDto {
  @IsIn([
    'AVAILABLE_IN_STORE',
    'TRANSFER_REQUIRED',
    'IN_TRANSFER',
    'READY_FOR_PICKUP',
    'CANCELLED',
  ])
  status:
    | 'AVAILABLE_IN_STORE'
    | 'TRANSFER_REQUIRED'
    | 'IN_TRANSFER'
    | 'READY_FOR_PICKUP'
    | 'CANCELLED';
}

export class VerifyStoreHandoverDto {
  @IsString()
  @MinLength(6)
  @MaxLength(10)
  otp: string;
}
