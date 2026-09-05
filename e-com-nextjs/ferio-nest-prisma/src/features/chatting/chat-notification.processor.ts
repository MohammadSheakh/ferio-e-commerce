import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { TenantFanoutService } from '../../tenancy/tenant-fanout.service';
import { SocketGateway } from '../socket.gateway/gateway/socket.gateway';

type ChatNotificationJob = {
  conversationId: string;
  messageId: string;
  messageText: string;
  senderId: string;
  senderProfile: { name?: string; profileImage?: string; role?: string };
  participantIds: string[];
  organizationId?: string;
};

/** Active Prisma-era worker for tenant-scoped conversation list updates. */
@Processor(QUEUE_NAMES.NOTIFY_PARTICIPANTS)
export class ChatNotificationProcessor extends WorkerHost {
  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly fanout: TenantFanoutService,
  ) {
    super();
  }

  async process(job: Job<ChatNotificationJob>) {
    const organizationId = job.data.organizationId;
    if (
      (process.env.TENANCY_ENABLED || 'false') === 'true' &&
      !organizationId
    ) {
      throw new Error('TENANT_CONTEXT_REQUIRED_FOR_CHAT_NOTIFICATION');
    }

    const emit = () =>
      Promise.all(
        job.data.participantIds
          .filter((participantId) => participantId !== job.data.senderId)
          .map((participantId) =>
            this.socketGateway.emitToUser(
              participantId,
              `conversation-list-updated::${participantId}`,
              {
                userId: job.data.senderId,
                conversationId: job.data.conversationId,
                messageId: job.data.messageId,
                message: job.data.messageText,
                sender: job.data.senderProfile,
              },
            ),
          ),
      );

    return organizationId
      ? this.fanout.forOrganization(organizationId, emit)
      : emit();
  }
}
