import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import {
  CreateReturnCaseDto,
  InspectReturnCaseDto,
  ReturnCaseQueryDto,
  ReviewReturnCaseDto,
} from './dto/return.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Admin Returns')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.RETURNS_READ)
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get('returns')
  getCases(@Query() query: ReturnCaseQueryDto) {
    return this.returns.getCases(query);
  }

  @Post('returns/:id/review')
  @Permissions(PERMISSIONS.RETURNS_MANAGE)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewReturnCaseDto,
    @User() actor: UserPayload,
  ) {
    return this.returns.review(id, dto, actor);
  }

  @Post('returns/:id/inspect')
  @Permissions(PERMISSIONS.RETURNS_MANAGE)
  inspect(
    @Param('id') id: string,
    @Body() dto: InspectReturnCaseDto,
    @User() actor: UserPayload,
  ) {
    return this.returns.inspect(id, dto, actor);
  }

  @Get('orders/:orderId/returns/eligibility')
  eligibility(@Param('orderId') orderId: string) {
    return this.returns.getEligibility(orderId);
  }

  @Get('orders/:orderId/returns')
  getOrderCases(@Param('orderId') orderId: string) {
    return this.returns.getOrderCases(orderId);
  }

  @Post('orders/:orderId/returns')
  @Permissions(PERMISSIONS.RETURNS_MANAGE)
  create(
    @Param('orderId') orderId: string,
    @Body() dto: CreateReturnCaseDto,
    @User() actor: UserPayload,
  ) {
    return this.returns.create(orderId, dto, actor);
  }
}
