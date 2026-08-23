import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, User } from '@app/common';
import type { UserPayload } from '@app/common';
import { CustomerNotificationsService } from './customer-notifications.service';

@ApiTags('Customer Notifications')
@ApiBearerAuth()
@Controller('account/notifications')
@UseGuards(AuthGuard)
export class CustomerNotificationsController {
  constructor(private readonly notifications: CustomerNotificationsService) {}

  @Get()
  list(
    @User() actor: UserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.list(
      actor.userId,
      Number(page) || 1,
      Number(limit) || 20,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  async unreadCount(@User() actor: UserPayload) {
    return { count: await this.notifications.unreadCount(actor.userId) };
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @User() actor: UserPayload) {
    return this.notifications.markRead(actor.userId, id);
  }

  @Post('read-all')
  markAllRead(@User() actor: UserPayload) {
    return this.notifications.markAllRead(actor.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() actor: UserPayload) {
    return this.notifications.remove(actor.userId, id);
  }
}
