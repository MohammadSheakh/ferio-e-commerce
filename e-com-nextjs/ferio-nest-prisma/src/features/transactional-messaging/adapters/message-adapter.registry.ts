import { Injectable } from '@nestjs/common';
import type { CommerceMessageChannel } from '@prisma/client';
import type {
  MessageChannelAdapter,
  MessageDispatchInput,
  MessageDispatchResult,
} from './message-channel-adapter.interface';
import type { MessagingCredentials } from '../utils/messaging-credentials.util';

type TenantProviderConfig = {
  channel: CommerceMessageChannel;
  provider: string;
  enabled: boolean;
  credentials?: MessagingCredentials;
};

@Injectable()
export class MessageAdapterRegistry {
  private readonly adapters = new Map<
    CommerceMessageChannel,
    MessageChannelAdapter
  >();

  register(adapter: MessageChannelAdapter) {
    this.adapters.set(adapter.channel, adapter);
  }

  readiness(configs: readonly TenantProviderConfig[] = []) {
    const channels: CommerceMessageChannel[] = ['WHATSAPP', 'SMS', 'EMAIL'];
    return channels.map((channel) => {
      const adapter = this.adapters.get(channel);
      const config = configs.find((item) => item.channel === channel);
      return {
        channel,
        provider: config?.provider ?? adapter?.provider ?? null,
        configured: Boolean(
          adapter &&
          config?.enabled &&
          adapter.isConfigured(config.credentials),
        ),
      };
    });
  }

  isConfigured(channel: CommerceMessageChannel, config?: TenantProviderConfig) {
    const adapter = this.adapters.get(channel);
    return Boolean(
      adapter && config?.enabled && adapter.isConfigured(config.credentials),
    );
  }

  async dispatch(
    channel: CommerceMessageChannel,
    input: MessageDispatchInput,
  ): Promise<MessageDispatchResult> {
    const adapter = this.adapters.get(channel);
    if (!adapter?.isConfigured(input.credentials)) {
      return {
        status: 'FAILED',
        errorCode: 'CHANNEL_NOT_CONFIGURED',
        errorMessage: `${channel} does not have an approved provider adapter`,
      };
    }
    return adapter.dispatch(input);
  }
}
