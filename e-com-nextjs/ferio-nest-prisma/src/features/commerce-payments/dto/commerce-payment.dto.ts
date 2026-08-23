import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class InitiateCommercePaymentDto {
  @IsString()
  @MaxLength(100)
  orderId: string;

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
