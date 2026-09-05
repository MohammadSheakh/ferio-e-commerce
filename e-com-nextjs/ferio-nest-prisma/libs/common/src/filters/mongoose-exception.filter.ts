import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorRecord = Record<string, unknown>;
type AuthenticatedRequest = Request & {
  user?: { userId?: unknown };
};
type ErrorResponseBody = {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  stack?: string;
};

function asRecord(value: unknown): ErrorRecord {
  return typeof value === 'object' && value !== null
    ? (value as ErrorRecord)
    : {};
}

function firstObjectKey(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return Object.keys(value)[0];
}

/**
 * Database Exception Filter
 * Prisma-only build: keep the filter behavior generic and avoid Mongoose types.
 * 
 * 📚 INDUSTRY STANDARD IMPLEMENTATION
 * 
 * Features:
 * ✅ User-friendly error messages
 * ✅ Proper HTTP status codes
 * ✅ Detailed logging
 * ✅ Development stack traces
 */
@Catch()
export class MongooseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongooseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';
    let error = 'Database Error';

    const errorObject = asRecord(exception);
    const code = errorObject.code;
    const name = errorObject.name;

    // Prisma databases often surface structured errors with a code field.
    if (code === 'P2002' || code === 11000) {
      status = HttpStatus.CONFLICT;
      const meta = asRecord(errorObject.meta);
      const field = firstObjectKey(meta.target) ?? firstObjectKey(errorObject.keyValue);
      message = field ? `${field} already exists` : 'Record already exists';
      error = 'Duplicate Key Error';
    }

    if (code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found';
      error = 'Not Found';
    }

    if (name === 'PrismaClientKnownRequestError') {
      status = HttpStatus.BAD_REQUEST;
      if (typeof errorObject.message === 'string') message = errorObject.message;
      error = 'Database Error';
    }

    if (exception instanceof Error && message === 'Database error occurred') {
      message = exception.message;
      error = exception.name || error;
    }

    if (name === 'MongoServerError') {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database service unavailable';
      error = 'Database Unavailable';
    }

    if (name === 'MongoNetworkError') {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Cannot connect to database';
      error = 'Network Error';
    }

    if (name === 'MongoTimeoutError') {
      status = HttpStatus.GATEWAY_TIMEOUT;
      message = 'Database operation timed out';
      error = 'Timeout Error';
    }

    // Get user ID if authenticated
    const userId = typeof request.user?.userId === 'string'
      ? request.user.userId
      : 'anonymous';

    // Log error with context
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message} - User: ${userId}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Build response body
    const responseBody: ErrorResponseBody = {
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
      if (exception instanceof Error && exception.stack) {
        responseBody.stack = exception.stack;
      }
    }

    response.status(status).json(responseBody);
  }
}
