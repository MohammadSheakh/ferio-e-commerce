import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  PlatformAuthGuard,
  PlatformPermissions,
  PLATFORM_PERMISSION,
} from './guards/platform-auth.guard';
import type { PlatformRequest } from './platform-request.type';
import {
  PlatformFeatureFlagKeyParamDto,
  UpsertPlatformFeatureFlagDto,
} from './dto/platform-feature-flag.dto';
import { PlatformFeatureFlagsService } from './services/platform-feature-flags.service';

@Controller('platform/feature-flags')
@UseGuards(PlatformAuthGuard)
export class PlatformFeatureFlagsController {
  constructor(private readonly flags: PlatformFeatureFlagsService) {}

  @Get()
  @PlatformPermissions(PLATFORM_PERMISSION.FEATURE_FLAG_READ)
  list() {
    return this.flags.list();
  }

  @Put(':key')
  @PlatformPermissions(PLATFORM_PERMISSION.FEATURE_FLAG_WRITE)
  upsert(
    @Param() params: PlatformFeatureFlagKeyParamDto,
    @Body() body: UpsertPlatformFeatureFlagDto,
    @Req() request: PlatformRequest,
  ) {
    return this.flags.upsert({
      key: params.key,
      enabled: body.enabled,
      note: body.note,
      actorId: request.platformPrincipal?.platformUserId,
    });
  }
}
