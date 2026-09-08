import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitYoutubeReviewDto {
  @IsUrl({ require_protocol: true }) youtubeUrl: string;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(100) reviewerName?: string;
}
export class ModerateYoutubeReviewDto {
  @IsOptional() @IsIn(['APPROVED', 'REJECTED']) status?:
    | 'APPROVED'
    | 'REJECTED';
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsString() @MaxLength(500) rejectionReason?: string;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(100) reviewerName?: string;
}
export class CreateReviewBannerDto {
  @IsUrl({ require_protocol: true }) imageUrl: string;
  @IsOptional() @IsString() @MaxLength(160) altText?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateReviewBannerDto extends CreateReviewBannerDto {}
