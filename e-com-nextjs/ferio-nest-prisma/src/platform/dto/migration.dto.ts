import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class StartMigrationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  canaryOrganizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32)
  concurrencyLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  failureThreshold?: number;
}
