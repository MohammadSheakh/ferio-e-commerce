import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const refundMethods = [
  'ORIGINAL_PAYMENT',
  'BANK_TRANSFER',
  'BKASH',
  'NAGAD',
  'ROCKET',
  'CASH',
  'OTHER',
] as const;
const executionModes = ['MANUAL', 'PROVIDER'] as const;
const outcomes = ['SUCCEEDED', 'FAILED'] as const;

export class CreateRefundDto {
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amount: number;

  @IsIn(refundMethods)
  method: (typeof refundMethods)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourcePaymentReference?: string;
}

export class RecordRefundResultDto {
  @IsIn(executionModes)
  executionMode: (typeof executionModes)[number];

  @IsIn(outcomes)
  outcome: (typeof outcomes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalReference?: string;

  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  failureReason?: string;
}
