export type CourierCode =
  | "PATHAO"
  | "STEADFAST"
  | "REDX"
  | "ECOURIER"
  | "PAPERFLY"
  | "CARRYBEE";

export type ShipmentProvider = {
  id: string;
  code: CourierCode;
  name: string;
  baseUrl: string;
  isActive: boolean;
  configured: boolean;
  pollingConfigured: boolean;
};

export type ShipmentEvent = {
  id: string;
  rawStatus: string;
  normalizedStatus: string;
  occurredAt: string;
  isOutOfOrder: boolean;
  ignoredReason: string | null;
};

export type Shipment = {
  id: string;
  status: string;
  externalShipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  weightGrams: number;
  codAmount: number;
  shippingCharge: number | null;
  lastRawStatus: string | null;
  exceptionReason: string | null;
  lastPolledAt: string | null;
  nextPollAt: string | null;
  pollingFailureCount: number;
  pollingError: string | null;
  provider: ShipmentProvider;
  events?: ShipmentEvent[];
  createdAt: string;
  order?: {
    id: string;
    reference: string;
    status: string;
    total: number;
    customer: { name: string; phoneNormalized: string };
    address: { district: string; area: string } | null;
  };
};

export type ShipmentPollAttempt = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  normalizedStatus: string | null;
  errorMessage: string | null;
  requestedByActorId: string | null;
  createdAt: string;
  finishedAt: string | null;
  shipment: {
    id: string;
    trackingNumber: string | null;
    status: string;
    provider: { code: CourierCode; name: string };
    order: { reference: string };
  };
};

export type ShipmentPollingQueueHealth = {
  available: boolean;
  scheduleEnabled: boolean;
  scheduleEveryMinutes: number;
  batchSize: number;
  eligibleCount: number;
  counts: CourierWebhookQueueHealth["counts"];
  scheduler: CourierWebhookQueueHealth["scheduler"];
  error?: string;
};

export type CourierWebhookLog = {
  id: string;
  providerCode: CourierCode;
  authValid: boolean;
  processed: boolean;
  attemptCount: number;
  processingStartedAt: string | null;
  lastAttemptAt: string | null;
  processingError: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type CourierWebhookQueueHealth = {
  available: boolean;
  scheduleEnabled: boolean;
  scheduleEveryMinutes: number;
  maxAttempts: number;
  recoverableCount: number;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null;
  scheduler: { id: string; name: string; next: number } | null;
  error?: string;
};

export const webhookStatus = (log: CourierWebhookLog) => {
  if (!log.authValid) {
    return { label: "Rejected", className: "bg-rose-50 text-rose-700" };
  }
  if (log.processed) {
    return { label: "Processed", className: "bg-emerald-50 text-emerald-700" };
  }
  if (log.processingStartedAt) {
    return { label: "Processing", className: "bg-surface text-ink2" };
  }
  return { label: "Retry needed", className: "bg-amber-50 text-amber-700" };
};

export type RtoItem = {
  id: string;
  expectedQuantity: number;
  receivedQuantity: number | null;
  sellableQuantity: number | null;
  damagedQuantity: number | null;
  lostQuantity: number | null;
  note: string | null;
  orderItem: { productName: string; variantName: string; sku: string };
  reservation: { status: string; inventoryId: string };
};

export type RtoCase = {
  id: string;
  reference: string;
  status: "AWAITING_RECEIPT" | "INSPECTED";
  reason: string | null;
  reasonNote: string | null;
  courierReason: string | null;
  outboundCourierCost: number;
  returnCourierCost: number;
  otherCost: number;
  totalCost: number;
  courierReturnedAt: string;
  inspectedAt: string | null;
  shipment: Shipment;
  order: {
    id: string;
    reference: string;
    status: string;
    currency: string;
    customer: { name: string; phoneNormalized: string };
  };
  items: RtoItem[];
};

export const shipmentStatusClass = (status: string) => {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (["FAILED", "DELIVERY_FAILED", "RETURNED", "RTO"].includes(status)) {
    return "bg-rose-50 text-rose-700";
  }
  if (["UNKNOWN", "RETURN_IN_PROGRESS"].includes(status)) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-surface text-ink2";
};
