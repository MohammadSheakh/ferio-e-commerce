import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
import { CreateRefundDto, RecordRefundResultDto } from './dto/refund.dto';
import { RefundsService } from './refunds.service';

@ApiTags('Admin Refunds')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.REFUNDS_READ)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get('returns/:returnCaseId/refund-eligibility')
  eligibility(@Param('returnCaseId') returnCaseId: string) {
    return this.refunds.eligibility(returnCaseId);
  }

  @Get('returns/:returnCaseId/refunds')
  getReturnRefunds(@Param('returnCaseId') returnCaseId: string) {
    return this.refunds.getReturnRefunds(returnCaseId);
  }

  @Post('returns/:returnCaseId/refunds')
  @Permissions(PERMISSIONS.REFUNDS_MANAGE)
  create(
    @Param('returnCaseId') returnCaseId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateRefundDto,
    @User() actor: UserPayload,
  ) {
    return this.refunds.create(returnCaseId, idempotencyKey, dto, actor);
  }

  @Post('refunds/:id/result')
  @Permissions(PERMISSIONS.REFUNDS_MANAGE)
  recordResult(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: RecordRefundResultDto,
    @User() actor: UserPayload,
  ) {
    return this.refunds.recordResult(id, idempotencyKey, dto, actor);
  }
}
