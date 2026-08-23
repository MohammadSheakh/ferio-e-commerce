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

const domains = [
  'INVENTORY',
  'PAYMENT',
  'SHIPPING',
  'REFUND',
  'SETTLEMENT',
] as const;
const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const;

export class ReconciliationQueryDto {
  @IsOptional()
  @IsIn(domains)
  domain?: (typeof domains)[number];

  @IsOptional()
  @IsIn(severities)
  severity?: (typeof severities)[number];

  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

export class RunReconciliationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(24)
  @Max(2160)
  overdueHours = 168;
}

export class ReconciliationActionDto {
  @IsIn(['CLAIM', 'ACKNOWLEDGE', 'RESOLVE', 'REOPEN'])
  action: 'CLAIM' | 'ACKNOWLEDGE' | 'RESOLVE' | 'REOPEN';

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note: string;
}
