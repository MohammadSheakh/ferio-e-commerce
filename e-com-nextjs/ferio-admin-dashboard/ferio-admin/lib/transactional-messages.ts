export type CommerceMessageStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED";

export type CommerceMessage = {
  id: string;
  eventType: string;
  templateKey: string;
  recipient: string;
  selectedChannel: "SMS" | "WHATSAPP" | "EMAIL" | null;
  channelPlan: Array<"SMS" | "WHATSAPP" | "EMAIL">;
  routingPolicyVersion: number | null;
  fallbackReason: string | null;
  terminalReason: string | null;
  status: CommerceMessageStatus;
  referenceType: string;
  referenceId: string;
  availableAt: string;
  lastError: string | null;
  createdAt: string;
  attempts: Array<{
    id: string;
    attemptNumber: number;
    channel: "SMS" | "WHATSAPP" | "EMAIL";
    provider: string;
    status: string;
    providerMessageId: string | null;
    errorMessage: string | null;
    errorCode: string | null;
    createdAt: string;
  }>;
};

export type CommerceMessagingPolicy = {
  id: string;
  enabled: boolean;
  version: number;
  channelPriority: Array<"SMS" | "WHATSAPP" | "EMAIL">;
  fallbackOnDefinitiveFailure: boolean;
  activationAllowed: boolean;
  channels: Array<{
    channel: "SMS" | "WHATSAPP" | "EMAIL";
    provider: string | null;
    configured: boolean;
  }>;
};

export type TransactionalMessageQueueHealth = {
  available: boolean;
  dispatchEnabled: boolean;
  everyMinutes: number;
  batchSize: number;
  eligibleCount?: number;
  policyEnabled: boolean;
  counts?: Record<string, number> | null;
  error?: string;
};

export type CommerceMessagePage = {
  items: CommerceMessage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  counts: Partial<Record<CommerceMessageStatus, number>>;
  dispatchConfigured: boolean;
  dispatchNote: string;
  policy: CommerceMessagingPolicy;
};

export function commerceMessageStatusClass(status: CommerceMessageStatus) {
  if (status === "DELIVERED" || status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED" || status === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (status === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-surface text-ink2";
}
