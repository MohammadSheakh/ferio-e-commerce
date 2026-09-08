import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class UpsertPlatformFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string | null;
}

export const PLATFORM_FEATURE_FLAG_KEY = /^[a-z][a-z0-9_.:-]*$/;

export class PlatformFeatureFlagKeyParamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(PLATFORM_FEATURE_FLAG_KEY)
  key!: string;
}
