import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdatePaymentProviderConfigDto {
  @IsObject()
  credentials: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
