import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { PrismaModule } from '@app/database';

import { ConversationController } from './conversation/conversation.controller';
import { ConversationService } from './conversation/conversation.service';

import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';
import { ChatNotificationProcessor } from './processors/chat-notification.processor';

import { SocketModule } from '../socket.gateway/socket.module';
import { RedisModule } from '@app/redis';
import { TenancyModule } from '../../tenancy/tenancy.module';
import {
  BULLMQ_NOTIFY_PARTICIPANTS_QUEUE,
  QUEUE_NAMES,
} from '@app/queue';

/**
 * Chatting Module
 *
 * 📚 CHAT MESSAGING MODULE
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET as string,
      signOptions: { expiresIn: '7d' },
    }),

    // Database Module
    PrismaModule,
    TenancyModule,

    // Redis Module (for state management)
    RedisModule,

    // Socket Module (for real-time updates)
    forwardRef(() => SocketModule),

    // BullMQ Queues
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.NOTIFY_PARTICIPANTS,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      },
    ),
  ],
  controllers: [
    ConversationController,
    MessageController,
  ],
  providers: [
    ConversationService,
    MessageService,
    ChatNotificationProcessor,

    // BullMQ Queue Providers
    {
      provide: BULLMQ_NOTIFY_PARTICIPANTS_QUEUE,
      useFactory: (queue: unknown) => queue,
      inject: [getQueueToken(QUEUE_NAMES.NOTIFY_PARTICIPANTS)],
    },
  ],
  exports: [
    ConversationService,
    MessageService,
  ],
})
export class ChattingModule {}
