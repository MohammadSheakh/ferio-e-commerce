export type WarrantyClaimStatus =
  | "SUBMITTED"
  | "PRODUCT_RECEIVED"
  | "UNDER_DIAGNOSIS"
  | "SENT_TO_BRAND"
  | "RECEIVED_FROM_BRAND"
  | "REPAIRED"
  | "RESOLVED"
  | "REJECTED";

export type WarrantyClaimHistory = {
  id: string;
  oldStatus: WarrantyClaimStatus | null;
  newStatus: WarrantyClaimStatus;
  actorId: string;
  source: "CUSTOMER" | "ADMIN" | "SYSTEM";
  note: string | null;
  createdAt: string;
};

export type WarrantyClaim = {
  id: string;
  reference: string;
  status: WarrantyClaimStatus;
  issueDescription: string;
  rejectionReason: string | null;
  adminNote: string | null;
  orderReferenceSnapshot: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  resolvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy: { name: string; email: string };
  orderItem: {
    order: {
      customer: { name: string; phoneNormalized: string };
    };
  };
  evidence: Array<{ id: string; imageUrl: string; createdAt: string }>;
  history: WarrantyClaimHistory[];
};

export type WarrantyClaimPage = {
  items: WarrantyClaim[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const warrantyTransitions: Record<
  WarrantyClaimStatus,
  WarrantyClaimStatus[]
> = {
  SUBMITTED: ["PRODUCT_RECEIVED", "REJECTED"],
  PRODUCT_RECEIVED: ["UNDER_DIAGNOSIS", "SENT_TO_BRAND", "REJECTED"],
  UNDER_DIAGNOSIS: ["REPAIRED", "SENT_TO_BRAND", "REJECTED"],
  SENT_TO_BRAND: ["RECEIVED_FROM_BRAND", "REJECTED"],
  RECEIVED_FROM_BRAND: ["REPAIRED", "RESOLVED", "REJECTED"],
  REPAIRED: ["RESOLVED"],
  RESOLVED: [],
  REJECTED: [],
};

export function formatWarrantyStatus(status: WarrantyClaimStatus) {
  const label = status.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function warrantyStatusClass(status: WarrantyClaimStatus) {
  if (status === "RESOLVED" || status === "REPAIRED")
    return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700";
  if (status === "SUBMITTED") return "bg-amber-50 text-amber-700";
  return "bg-surface text-ink2";
}
