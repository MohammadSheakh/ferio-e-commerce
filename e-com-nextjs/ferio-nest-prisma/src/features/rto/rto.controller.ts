import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
  User,
} from '@app/common';
import type { UserPayload } from '@app/common';
import { InspectRtoCaseDto } from './dto/rto.dto';
import { RtoService } from './rto.service';

@ApiTags('Admin RTO')
@ApiBearerAuth()
@Controller('admin/rto')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.RTO_READ)
export class RtoController {
  constructor(private readonly rto: RtoService) {}

  @Get()
  list() {
    return this.rto.list();
  }

  @Post(':id/inspect')
  @Permissions(PERMISSIONS.RTO_MANAGE)
  inspect(
    @Param('id') id: string,
    @Body() dto: InspectRtoCaseDto,
    @User() actor: UserPayload,
  ) {
    return this.rto.inspect(id, dto, actor);
  }
}
