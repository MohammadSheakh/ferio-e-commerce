export type ReturnCaseStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "INSPECTED";

export type ReturnEligibility = {
  orderId: string;
  status: "ELIGIBLE" | "INELIGIBLE" | "REVIEW_REQUIRED";
  reasons: string[];
  windowEndsAt: string | null;
  returnWindowDays: number | null;
  deliveredAt: string | null;
  items: Array<{
    orderItemId: string;
    productName: string;
    variantName: string;
    sku: string;
    orderedQuantity: number;
    remainingQuantity: number;
  }>;
};

export type RefundEligibility = {
  returnCaseId: string;
  orderId: string;
  currency: string;
  paymentMethod: string;
  inspected: boolean;
  finalResolution: string | null;
  maximumRefundable: number;
  reservedAmount: number;
  remainingAmount: number;
};

export type RefundAttempt = {
  id: string;
  attemptNumber: number;
  executionMode: "MANUAL" | "PROVIDER";
  outcome: "SUCCEEDED" | "FAILED";
  provider: string | null;
  externalReference: string | null;
  failureReason: string | null;
  actorId: string;
  createdAt: string;
};

export type CommerceRefund = {
  id: string;
  reference: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "REQUIRES_ACTION"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  method:
    | "ORIGINAL_PAYMENT"
    | "BANK_TRANSFER"
    | "BKASH"
    | "NAGAD"
    | "ROCKET"
    | "CASH"
    | "OTHER";
  amount: number;
  currency: string;
  reason: string;
  sourcePaymentReference: string | null;
  provider: string | null;
  providerRefundId: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  attempts: RefundAttempt[];
};

export type ReturnCase = {
  id: string;
  rmaReference: string;
  status: ReturnCaseStatus;
  eligibilityStatus: ReturnEligibility["status"];
  eligibilityReasons: string[];
  reason: string;
  description: string;
  requestedResolution: string;
  requestChannel: string;
  reviewDecision: string | null;
  reviewReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  inspectionDecision: "ACCEPT" | "PARTIAL_ACCEPT" | "REJECT" | null;
  finalResolution:
    | "REFUND"
    | "REPLACEMENT"
    | "EXCHANGE"
    | "REJECTED"
    | "OTHER"
    | null;
  inspectionNote: string | null;
  receivedAt: string | null;
  inspectedAt: string | null;
  order: {
    id: string;
    reference: string;
    status: string;
    customer: { name: string; phoneNormalized: string };
  };
  items: Array<{
    id: string;
    requestedQuantity: number;
    approvedQuantity: number | null;
    receivedQuantity: number | null;
    acceptedQuantity: number | null;
    condition: string | null;
    inventoryDisposition: string | null;
    inspectionNote: string | null;
    orderItem: {
      id: string;
      productName: string;
      variantName: string;
      sku: string;
      quantity: number;
    };
  }>;
  evidence: Array<{ id: string; url: string }>;
  history: Array<{
    id: string;
    oldStatus: ReturnCaseStatus | null;
    newStatus: ReturnCaseStatus;
    note: string | null;
    createdAt: string;
  }>;
  refunds: CommerceRefund[];
};

export type ReturnCasePage = {
  items: ReturnCase[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function returnStatusClass(status: ReturnCaseStatus) {
  if (
    status === "APPROVED" ||
    status === "PARTIALLY_APPROVED" ||
    status === "INSPECTED"
  )
    return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED" || status === "CANCELLED")
    return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}
