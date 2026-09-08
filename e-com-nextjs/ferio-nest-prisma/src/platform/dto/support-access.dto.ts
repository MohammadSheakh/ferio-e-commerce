import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSupportAccessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1_000)
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(8 * 60)
  ttlMinutes?: number;

  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;
}

export class ListSupportAccessQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationId?: string;
}
