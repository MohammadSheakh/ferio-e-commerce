import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlatformInvoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationId!: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

export class ManualBillingActionDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

export class RecoverPlatformPaymentAttemptsDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  staleAfterMinutes?: number;
}

export class PlatformBillingCallbackQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ref!: string;

  @IsIn(['success', 'fail', 'cancel', 'ipn'])
  outcome!: 'success' | 'fail' | 'cancel' | 'ipn';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  val_id?: string;
}
