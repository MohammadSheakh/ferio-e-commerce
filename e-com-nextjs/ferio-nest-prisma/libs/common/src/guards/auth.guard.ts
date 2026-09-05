import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UserPayload } from '../types/user-payload.type';
import type { AuthenticatedRequest } from '../types/http-request.type';

/**
 * Authentication Guard
 *
 * 📚 INDUSTRY STANDARD IMPLEMENTATION
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Extract request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      // Even if public, if a token exists, try to decode it for @User()
      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          });
          if (!this.matchesResolvedTenant(request, payload)) return true;
          request.user = payload;
        } catch {
          // Ignore errors for public routes
        }
      }
      return true;
    }

    // Token not found for private route
    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      // Verify token
      const payload: UserPayload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (!this.matchesResolvedTenant(request, payload)) {
        throw new UnauthorizedException('Token is not valid for this tenant');
      }

      // Attach payload
      request.user = payload;
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }

  private matchesResolvedTenant(
    request: AuthenticatedRequest,
    payload: UserPayload,
  ): boolean {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') return true;
    const resolvedOrganizationId = request.tenantOrganizationId;
    return Boolean(
      resolvedOrganizationId &&
      payload.organizationId &&
      payload.organizationId === resolvedOrganizationId,
    );
  }
}
