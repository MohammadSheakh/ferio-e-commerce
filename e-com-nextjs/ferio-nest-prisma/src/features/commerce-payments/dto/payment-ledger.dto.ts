import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const attemptStatuses = [
  'CREATED',
  'INITIATING',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'UNKNOWN',
] as const;
const paymentStatuses = [
  'UNPAID',
  'PAID',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;
const refundStatuses = [
  'NONE',
  'PENDING',
  'PARTIAL',
  'REFUNDED',
  'FAILED',
] as const;

export class PaymentLedgerQueryDto {
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
  @IsIn(['SSLCOMMERZ', 'AAMARPAY'])
  provider?: 'SSLCOMMERZ' | 'AAMARPAY';

  @IsOptional()
  @IsIn(attemptStatuses)
  status?: (typeof attemptStatuses)[number];

  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: (typeof paymentStatuses)[number];

  @IsOptional()
  @IsIn(refundStatuses)
  refundStatus?: (typeof refundStatuses)[number];
}
