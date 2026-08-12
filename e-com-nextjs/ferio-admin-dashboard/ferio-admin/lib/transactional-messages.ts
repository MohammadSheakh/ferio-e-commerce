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
    createdAt: string;
  }>;
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
};

export function commerceMessageStatusClass(status: CommerceMessageStatus) {
  if (status === "DELIVERED" || status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED" || status === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (status === "BLOCKED") return "bg-amber-50 text-amber-700";
  return "bg-surface text-ink2";
}
