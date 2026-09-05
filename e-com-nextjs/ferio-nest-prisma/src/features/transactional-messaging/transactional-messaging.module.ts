import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database';
import { TenancyModule } from '../../tenancy/tenancy.module';
import { AuthModule } from '../authentication/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MessageAdapterRegistry } from './adapters/message-adapter.registry';
import { TransactionalMessagingController } from './controllers/transactional-messaging.controller';
import { TransactionalMessageDispatcher } from './services/transactional-message-dispatcher';
import { TransactionalMessageProcessor } from './processors/transactional-message.processor';
import { TransactionalMessageQueue } from './queues/transactional-message.queue';
import { TransactionalMessagingService } from './services/transactional-messaging.service';

@Module({
  imports: [ TenancyModule,PrismaModule, AuthModule, AuditModule],
  controllers: [TransactionalMessagingController],
  providers: [
    TransactionalMessagingService,
    MessageAdapterRegistry,
    TransactionalMessageDispatcher,
    TransactionalMessageQueue,
    TransactionalMessageProcessor,
  ],
  exports: [TransactionalMessagingService],
})
export class TransactionalMessagingModule {}
