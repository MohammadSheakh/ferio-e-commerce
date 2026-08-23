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
} from 'class-validator';

export class CreateWalletTopUpDto {
  @IsIn(['BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER'])
  provider: 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER';

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(10_000_000)
  amount: number;

  @IsString()
  @MaxLength(120)
  customerReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNote?: string;
}

export class WalletTopUpQueryDto {
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
  @IsIn(['PENDING_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED'])
  status?: 'PENDING_REVIEW' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class ReviewWalletTopUpDto {
  @IsIn(['COMPLETED', 'REJECTED'])
  status: 'COMPLETED' | 'REJECTED';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reviewNote: string;
}
