import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantMembershipGuard } from '../../../tenancy/tenant-membership.guard';
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
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportsService } from '../services/reports.service';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.REPORTS_READ)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  overview(@Query() query: ReportQueryDto) {
    return this.reports.overview(query);
  }

  @Get('orders-export')
  ordersExport(@Query() query: ReportQueryDto, @User() actor: UserPayload) {
    return this.reports.ordersExport(query, actor);
  }
}
