import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import type {
  PlanBillingInterval,
  SubscriptionStatus,
} from '../generated/platform-client';

export class PlanEntitlementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  featureKey!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  limit?: number | null;
}

export class CreatePlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingInterval?: PlanBillingInterval;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  amountMinor?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementDto)
  entitlements!: PlanEntitlementDto[];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingInterval?: PlanBillingInterval;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  amountMinor?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementDto)
  entitlements?: PlanEntitlementDto[];
}

export class StartTrialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  planKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  trialDays?: number;
}

export class TransitionSubscriptionDto {
  @IsIn(['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'])
  status!: SubscriptionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
