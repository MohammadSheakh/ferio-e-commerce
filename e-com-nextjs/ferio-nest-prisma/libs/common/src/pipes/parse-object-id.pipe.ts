import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * Parse ObjectId Pipe
 * Validates and transforms string to ObjectId
 * 
 * Usage:
 * @Param('id', ParseObjectIdPipe) id: string
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    void metadata;
    if (!value) {
      throw new BadRequestException('ID is required');
    }

    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new BadRequestException(`Invalid ID format: ${value}`);
    }

    return value;
  }
}
