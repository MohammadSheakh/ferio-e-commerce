import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import {
  CompleteStaffAccessDto,
  InviteStaffDto,
  UpdateStaffAccessDto,
} from './staff-access.dto';
import { StaffAccessService } from './staff-access.service';

@Controller('staff-access')
export class PublicStaffAccessController {
  constructor(private readonly staffAccess: StaffAccessService) {}

  @Post('accept-invitation')
  accept(@Body() dto: CompleteStaffAccessDto) {
    return this.staffAccess.acceptInvite(dto.token, dto.password);
  }

  @Post('complete-reset')
  reset(@Body() dto: CompleteStaffAccessDto) {
    return this.staffAccess.completeReset(dto.token, dto.password);
  }
}

@Controller('admin/staff')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.STAFF_READ)
export class AdminStaffAccessController {
  constructor(private readonly staffAccess: StaffAccessService) {}

  @Get()
  list() {
    return this.staffAccess.list();
  }

  @Post('invitations')
  @Permissions(PERMISSIONS.STAFF_MANAGE)
  invite(@Body() dto: InviteStaffDto, @User() actor: UserPayload) {
    return this.staffAccess.invite(dto, actor);
  }

  @Patch(':id/deactivate')
  @Permissions(PERMISSIONS.STAFF_MANAGE)
  deactivate(@Param('id') id: string, @User() actor: UserPayload) {
    return this.staffAccess.deactivate(id, actor);
  }

  @Patch(':id/access')
  @Permissions(PERMISSIONS.STAFF_MANAGE)
  updateAccess(
    @Param('id') id: string,
    @Body() dto: UpdateStaffAccessDto,
    @User() actor: UserPayload,
  ) {
    return this.staffAccess.updateAccess(id, dto, actor);
  }

  @Post(':id/reset')
  @Permissions(PERMISSIONS.STAFF_MANAGE)
  reset(@Param('id') id: string, @User() actor: UserPayload) {
    return this.staffAccess.issueReset(id, actor);
  }
}
