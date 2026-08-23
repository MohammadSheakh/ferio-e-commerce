import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class SaveServiceDto {
  @IsString() @MinLength(2) @MaxLength(160) name: string;
  @IsOptional() @IsString() slug?: string;
  @IsString() @MinLength(10) @MaxLength(5000) description: string;
  @IsString() categoryId: string;
  @Type(() => Number) @IsInt() @Min(0) price: number;
  @Type(() => Number) @IsInt() @Min(15) durationMinutes: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadTimeHours?: number;
  @IsOptional() @IsString() @MaxLength(500) serviceAreaNote?: string;
  @IsOptional() @IsString() @MaxLength(1000) requirements?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) imageUrl?: string;
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) status?:
    | 'DRAFT'
    | 'ACTIVE'
    | 'ARCHIVED';
}
export class CreateBookingDto {
  @IsString() serviceId: string;
  @IsString() @MinLength(2) @MaxLength(120) customerName: string;
  @IsString() @MaxLength(32) phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsISO8601() preferredAt: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) customerNote?: string;
}
export class UpdateBookingStatusDto {
  @IsIn(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'])
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
