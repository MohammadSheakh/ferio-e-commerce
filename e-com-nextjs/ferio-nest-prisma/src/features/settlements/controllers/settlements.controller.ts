import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantMembershipGuard } from '../../../tenancy/tenant-membership.guard';
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
  CreateCourierSettlementDto,
  ImportSettlementReportDto,
  PreflightSettlementReportDto,
} from '../dto/settlement.dto';
import { SettlementImportsService } from '../services/settlement-imports.service';
import { SettlementReportParserService } from '../services/settlement-report-parser.service';
import { SettlementsService } from '../services/settlements.service';

@ApiTags('Admin Settlements')
@ApiBearerAuth()
@Controller('admin/settlements')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.SETTLEMENTS_READ)
export class SettlementsController {
  constructor(
    private readonly settlements: SettlementsService,
    private readonly imports: SettlementImportsService,
    private readonly reportParser: SettlementReportParserService,
  ) {}

  @Get()
  list() {
    return this.settlements.list();
  }

  @Get('eligible-collections')
  eligibleCollections() {
    return this.settlements.eligibleCollections();
  }

  @Get('imports')
  listImports() {
    return this.imports.list();
  }

  @Get('imports/template')
  settlementImportTemplate() {
    return this.reportParser.template();
  }

  @Post('imports')
  @Permissions(PERMISSIONS.SETTLEMENTS_MANAGE)
  importReport(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: ImportSettlementReportDto,
    @User() actor: UserPayload,
  ) {
    return this.imports.importReport(idempotencyKey, dto, actor);
  }

  @Post('imports/preflight')
  preflightReport(@Body() dto: PreflightSettlementReportDto) {
    return this.reportParser.preflight(dto);
  }

  @Post()
  @Permissions(PERMISSIONS.SETTLEMENTS_MANAGE)
  create(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateCourierSettlementDto,
    @User() actor: UserPayload,
  ) {
    return this.settlements.create(idempotencyKey, dto, actor);
  }
}
