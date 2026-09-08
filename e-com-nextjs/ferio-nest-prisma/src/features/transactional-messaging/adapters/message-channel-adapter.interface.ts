import type { CommerceMessageChannel } from '@prisma/client';
import type { MessagingCredentials } from '../utils/messaging-credentials.util';

export type MessageDispatchInput = {
  recipient: string;
  templateKey: string;
  templateVersion: number;
  subject: string | null;
  body: string;
  payload: unknown;
  idempotencyKey: string;
  credentials?: MessagingCredentials;
};

export type MessageDispatchResult = {
  status: 'ACCEPTED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN';
  providerMessageId?: string;
  response?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

export interface MessageChannelAdapter {
  readonly channel: CommerceMessageChannel;
  readonly provider: string;
  isConfigured(credentials?: MessagingCredentials): boolean;
  dispatch(input: MessageDispatchInput): Promise<MessageDispatchResult>;
}
