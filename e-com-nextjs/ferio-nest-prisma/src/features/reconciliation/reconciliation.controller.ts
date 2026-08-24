import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantMembershipGuard } from '../../tenancy/tenant-membership.guard';
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
  ReconciliationActionDto,
  ReconciliationQueryDto,
  RunReconciliationDto,
} from './dto/reconciliation.dto';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationQueue } from './reconciliation.queue';

@ApiTags('Admin Reconciliation')
@ApiBearerAuth()
@Controller('admin/reconciliation')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.RECONCILIATION_READ)
export class ReconciliationController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly queue: ReconciliationQueue,
  ) {}

  @Get('findings')
  list(@Query() query: ReconciliationQueryDto) {
    return this.reconciliation.list(query);
  }

  @Get('alerts')
  alerts() {
    return this.reconciliation.getOperationalAlerts();
  }

  @Post('scan')
  @Permissions(PERMISSIONS.RECONCILIATION_MANAGE)
  run(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: RunReconciliationDto,
    @User() actor: UserPayload,
  ) {
    return this.reconciliation.run(idempotencyKey, dto, actor);
  }

  @Get('queue-health')
  queueHealth() {
    return this.queue.health();
  }

  @Post('runs/:id/retry')
  @Permissions(PERMISSIONS.RECONCILIATION_MANAGE)
  retry(@Param('id') id: string, @User() actor: UserPayload) {
    return this.queue.enqueueRetry(id, actor.userId);
  }

  @Post('findings/:id/action')
  @Permissions(PERMISSIONS.RECONCILIATION_MANAGE)
  action(
    @Param('id') id: string,
    @Body() dto: ReconciliationActionDto,
    @User() actor: UserPayload,
  ) {
    return this.reconciliation.action(id, dto, actor);
  }
}
