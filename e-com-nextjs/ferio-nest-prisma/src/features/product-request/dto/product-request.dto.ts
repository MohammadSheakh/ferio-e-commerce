import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductRequestDto {
  @ApiProperty({ description: 'Product Name & Model description (multiline)' })
  @IsString()
  @MinLength(2)
  productName: string;

  @ApiPropertyOptional({ description: 'Requester name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
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
