import { ShipmentProviderCode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateShipmentDto {
  @IsEnum(ShipmentProviderCode)
  provider: ShipmentProviderCode;

  @IsBoolean()
  @Equals(true)
  parcelReady: true;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsObject()
  providerData?: Record<string, number | string>;
}

export class UpdateShipmentProviderDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
