import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedSocket } from '../services/socket-auth.service';

interface SocketJwtPayload {
  userId?: string;
  role?: string;
  name?: string;
  organizationId?: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * WebSocket JWT Guard
 *
 * 📚 SOCKET.IO AUTHENTICATION GUARD
 *
 * Validates JWT tokens for WebSocket connections
 * Compatible with Express.js socket authentication
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();

      const auth = client.handshake.auth as Record<string, unknown>;
      const token =
        stringValue(auth.token) || stringValue(client.handshake.headers.token);

      if (!token) {
        throw new WsException('Authentication token required');
      }

      const payload = await this.jwtService.verifyAsync<SocketJwtPayload>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET ?? '',
        },
      );

      if (!payload || !payload.userId) {
        throw new WsException('Invalid authentication token');
      }

      // Normalize the verified token into the gateway's authenticated shape.
      client.data.user = {
        userId: payload.userId,
        role: payload.role ?? 'user',
        name: payload.name ?? '',
        organizationId: payload.organizationId,
      };
      client.data.userId = payload.userId;

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Authentication failed');
    }
  }
}
