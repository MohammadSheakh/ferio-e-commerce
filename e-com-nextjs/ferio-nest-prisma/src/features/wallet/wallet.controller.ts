import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
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
  CreateWalletTopUpDto,
  ReviewWalletTopUpDto,
  WalletTopUpQueryDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('Customer Wallet')
@ApiBearerAuth()
@Controller('account/wallet')
@UseGuards(AuthGuard)
export class CustomerWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  summary(
    @User() actor: UserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wallet.summary(actor.userId, Number(page) || 1, Number(limit) || 20);
  }

  @Post('top-ups')
  requestTopUp(
    @Body() dto: CreateWalletTopUpDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @User() actor: UserPayload,
  ) {
    return this.wallet.requestTopUp(actor.userId, dto, idempotencyKey);
  }
}

@ApiTags('Admin Wallets')
@ApiBearerAuth()
@Controller('admin/wallet')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permissions(PERMISSIONS.WALLETS_READ)
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('top-ups')
  listTopUps(@Query() query: WalletTopUpQueryDto) {
    return this.wallet.listTopUps(query);
  }

  @Patch('top-ups/:id')
  @Permissions(PERMISSIONS.WALLETS_MANAGE)
  reviewTopUp(
    @Param('id') id: string,
    @Body() dto: ReviewWalletTopUpDto,
    @User() actor: UserPayload,
  ) {
    return this.wallet.reviewTopUp(id, dto, actor);
  }
}
