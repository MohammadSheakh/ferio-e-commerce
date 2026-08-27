import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsIn(['PATHAO', 'STEADFAST'])
  provider?: 'PATHAO' | 'STEADFAST';
}
