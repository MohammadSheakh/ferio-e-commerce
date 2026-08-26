import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProductRequestDto {
  @ApiProperty({ description: 'Product Name & Model description (multiline)' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  productName: string;

  @ApiPropertyOptional({ description: 'Requester name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class UpdateProductRequestStatusDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'COLLECTED', 'CONTACTED', 'DONE'] })
  @IsOptional()
  @IsEnum(['PENDING', 'COLLECTED', 'CONTACTED', 'DONE'])
  status?: 'PENDING' | 'COLLECTED' | 'CONTACTED' | 'DONE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}

export class QueryProductRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
