import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Transform Response Interceptor
 * 
 * 📚 INDUSTRY STANDARD IMPLEMENTATION
 * 
 * Standardizes all API responses to a consistent format:
 * {
 *   success: true,
 *   data: { ... },
 *   message: 'Operation successful'
 * }
 * 
 * Features:
 * ✅ Consistent response structure
 * ✅ Automatic success flag
 * ✅ Optional message
 * ✅ Error handling passthrough
 * 
 * Usage:
 * @UseInterceptors(TransformResponseInterceptor)
 * async getData() {
 *   return { id: 1, name: 'Test' };
 *   // Transforms to: { success: true, data: { id: 1, name: 'Test' } }
 * }
 */
export interface Response<T> {
  data: T;
  message?: string;
  success?: boolean;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: T): Response<T> => {
        // If data is already in response format, return as-is
        if (isRecord(data) && 'success' in data && 'data' in data) {
          const response: Response<T> = {
            data: data.data as T,
            success: data.success === true,
          };
          if (typeof data.message === 'string') response.message = data.message;
          return response;
        }

        // If data already has a message field, preserve it
        if (isRecord(data) && 'message' in data) {
          return {
            success: true,
            data,
            message: typeof data.message === 'string' ? data.message : undefined,
          };
        }

        // Wrap data in standard response format
        return {
          success: true,
          data,
          message: this.getMessageFromContext(context),
        };
      }),
    );
  }

  /**
   * Get message based on HTTP method and context
   */
  private getMessageFromContext(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    const messages: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource partially updated successfully',
      DELETE: 'Resource deleted successfully',
    };

    return messages[method] || 'Operation successful';
  }
}
