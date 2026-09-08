import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import {
  CreateSupportAccessDto,
  ListSupportAccessQueryDto,
} from './dto/support-access.dto';
import { SupportAccessService } from './services/support-access.service';
import type { PlatformRequest } from './platform-request.type';

@Controller('platform')
@UseGuards(PlatformAuthGuard)
export class PlatformSupportAccessController {
  constructor(private readonly supportAccess: SupportAccessService) {}

  @Get('support-access')
  @PlatformPermissions('support_access:request')
  listSupportAccess(@Query() query: ListSupportAccessQueryDto) {
    return this.supportAccess.listActive(query.organizationId);
  }

  @Post('support-access/:grantId/revoke')
  @PlatformPermissions('support_access:request')
  revokeSupportAccess(
    @Param('grantId') grantId: string,
    @Req() request: PlatformRequest,
  ) {
    return this.supportAccess.revoke(
      grantId,
      request.platformPrincipal?.platformUserId,
    );
  }

  @Post('support-access')
  @PlatformPermissions('support_access:request')
  requestSupportAccess(
    @Body() body: CreateSupportAccessDto,
    @Req() request: PlatformRequest,
  ) {
    const principal = request.platformPrincipal;
    if (!principal) throw new UnauthorizedException('PLATFORM_AUTH_REQUIRED');
    return this.supportAccess.grant({
      organizationId: body.organizationId,
      platformUserId: principal.platformUserId,
      reason: body.reason,
      scope: body.scope,
      ttlMinutes: body.ttlMinutes,
      actorId: principal.platformUserId,
    });
  }
}
