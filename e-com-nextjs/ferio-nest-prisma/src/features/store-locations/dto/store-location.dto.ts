import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class StoreQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateStoreLocationDto {
  @ApiProperty({ example: 'STORE-DHN' })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: 'Ferio Dhanmondi Flagship Store' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '+8801700000001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'dhanmondi@ferio.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'Dhanmondi' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'House 42, Road 11/A, Dhanmondi, Dhaka' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 23.7461 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 90.3742 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '10:00 AM - 08:30 PM' })
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiPropertyOptional({ example: 'Sat - Thu' })
  @IsOptional()
  @IsString()
  operatingDays?: string;

  @ApiPropertyOptional({ example: 'Show your pickup OTP at ground floor desk.' })
  @IsOptional()
  @IsString()
  pickupInstructions?: string;
}

export class UpdateStoreLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatingDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupInstructions?: string;
}

export class CheckStoreAvailabilityDto {
  @ApiProperty({ example: 'clx...storeId' })
  @IsString()
  storeId!: string;

  @ApiProperty({ example: ['clx...variantId'] })
  @IsArray()
  @IsString({ each: true })
  variantIds!: string[];
}
