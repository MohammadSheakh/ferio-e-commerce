import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PlatformAuthService } from './services/platform-auth.service';
import { PlatformAuditService } from './services/platform-audit.service';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';

@Controller('platform')
@UseGuards(ThrottlerGuard, PlatformAuthGuard)
export class PlatformAuthController {
  constructor(
    private readonly platformAuth: PlatformAuthService,
    private readonly jwt: JwtService,
    private readonly audit: PlatformAuditService,
  ) {}

  @Post('auth/login')
  @Throttle({ platform: { limit: 10, ttl: 60_000 } })
  @PlatformPermissions()
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException('PLATFORM_CREDENTIALS_INVALID');
    }
    const principal = await this.platformAuth.verifyCredentials(
      body.email,
      body.password,
    );
    const token = await this.jwt.signAsync(
      {
        sub: principal.platformUserId,
        email: principal.email,
        roles: principal.roles,
        realm: 'platform',
      },
      { secret: process.env.PLATFORM_JWT_SECRET, expiresIn: '8h' },
    );
    await this.audit.record({
      action: 'PLATFORM_LOGIN',
      entityType: 'PlatformUser',
      entityId: principal.platformUserId,
      actorId: principal.platformUserId,
    });
    return { accessToken: token, roles: principal.roles };
  }
}
