import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class InitiateCommercePaymentDto {
  @IsString()
  @MaxLength(100)
  orderId: string;

  /**
   * Order reference + placement phone prove the caller is the customer who
   * placed this order. Prevents anonymous callers from resetting arbitrary
   * orders into payment-pending or spamming gateway sessions.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  reference: string;

  @IsString()
  @MinLength(11)
  @MaxLength(20)
  phone: string;

  @IsIn(['SSLCOMMERZ', 'AAMARPAY'])
  provider: 'SSLCOMMERZ' | 'AAMARPAY';
}

export class RetryCommercePaymentDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  reference: string;

  @IsString()
  @MinLength(11)
  @MaxLength(20)
  phone: string;

  @IsIn(['SSLCOMMERZ', 'AAMARPAY'])
  provider: 'SSLCOMMERZ' | 'AAMARPAY';
}
