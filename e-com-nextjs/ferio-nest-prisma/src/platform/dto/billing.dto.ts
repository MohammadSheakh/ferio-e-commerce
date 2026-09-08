import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
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
