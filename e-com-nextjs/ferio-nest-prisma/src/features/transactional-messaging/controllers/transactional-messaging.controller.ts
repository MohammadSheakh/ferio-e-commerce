import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantMembershipGuard } from '../../../tenancy/guards/tenant-membership.guard';
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
  TransactionalMessageQueryDto,
  UpdateMessageTemplateDto,
  UpdateMessagingProviderConfigDto,
  UpdateMessagingPolicyDto,
} from '../dto/transactional-message.dto';
import { TransactionalMessagingService } from '../services/transactional-messaging.service';
import { TransactionalMessageQueue } from '../queues/transactional-message.queue';

@ApiTags('Admin Transactional Messages')
@ApiBearerAuth()
@Controller('admin/transactional-messages')
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard, TenantMembershipGuard)
@Roles('admin')
@Permissions(PERMISSIONS.MESSAGING_READ)
export class TransactionalMessagingController {
  constructor(
    private readonly messages: TransactionalMessagingService,
    private readonly queue: TransactionalMessageQueue,
  ) {}

  @Get()
  getMessages(@Query() query: TransactionalMessageQueryDto) {
    return this.messages.getMessages(query);
  }

  @Get('policy')
  getPolicy() {
    return this.messages.getPolicy();
  }

  @Get('templates')
  getTemplates() {
    return this.messages.getTemplates();
  }

  @Get('providers')
  getProviders() {
    return this.messages.getProviderConfigs();
  }

  @Patch('providers/:channel')
  @Permissions(PERMISSIONS.MESSAGING_MANAGE)
  updateProvider(
    @Param('channel') channel: 'WHATSAPP' | 'SMS' | 'EMAIL',
    @Body() dto: UpdateMessagingProviderConfigDto,
    @User() actor: UserPayload,
  ) {
    if (!['WHATSAPP', 'SMS', 'EMAIL'].includes(channel)) {
      throw new BadRequestException('Unknown messaging channel');
    }
    return this.messages.updateProviderConfig(channel, dto, actor);
  }

  @Patch('templates/:key')
  @Permissions(PERMISSIONS.MESSAGING_MANAGE)
  updateTemplate(
    @Param('key') key: string,
    @Body() dto: UpdateMessageTemplateDto,
    @User() actor: UserPayload,
  ) {
    return this.messages.updateTemplate(key, dto, actor);
  }

  @Patch('policy')
  @Permissions(PERMISSIONS.MESSAGING_MANAGE)
  updatePolicy(
    @Body() dto: UpdateMessagingPolicyDto,
    @User() actor: UserPayload,
  ) {
    return this.messages.updatePolicy(dto, actor);
  }

  @Get('queue-health')
  queueHealth() {
    return this.queue.health();
  }

  @Post(':id/retry')
  @Permissions(PERMISSIONS.MESSAGING_MANAGE)
  retry(@Param('id') id: string, @User() actor: UserPayload) {
    return this.queue.retry(id, actor);
  }
}
