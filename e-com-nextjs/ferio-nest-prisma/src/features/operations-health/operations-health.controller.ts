import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  PERMISSIONS,
  Permissions,
  PermissionsGuard,
  Roles,
  RolesGuard,
} from '@app/common';
import { OperationsHealthService } from './operations-health.service';

@ApiTags('Admin Operations')
@ApiBearerAuth()
@Controller('admin/operations')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.RECONCILIATION_READ)
export class OperationsHealthController {
  constructor(private readonly operationsHealth: OperationsHealthService) {}

  @Get('health')
  getHealth() {
    return this.operationsHealth.getHealth();
  }
}
