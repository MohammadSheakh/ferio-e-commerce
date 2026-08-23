import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class LinkCustomerAccountDto {
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  reference: string;

  @IsString()
  @MaxLength(32)
  phone: string;
}

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName: string;

  @IsString()
  @MinLength(11)
  @MaxLength(32)
  phone: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detailedAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detailedAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  isDefault?: boolean;
}
