import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity = 1;
}

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @IsOptional()
  @IsString()
  replacementVariantId?: string;
}

export class SaveCartDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class ReorderDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderItemIds?: string[];
}
