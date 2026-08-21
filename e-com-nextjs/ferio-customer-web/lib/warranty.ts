export type WarrantyClaimStatus =
  | "SUBMITTED"
  | "PRODUCT_RECEIVED"
  | "UNDER_DIAGNOSIS"
  | "SENT_TO_BRAND"
  | "RECEIVED_FROM_BRAND"
  | "REPAIRED"
  | "RESOLVED"
  | "REJECTED";

export type WarrantyOrderItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
};

export type WarrantyClaim = {
  id: string;
  reference: string;
  status: WarrantyClaimStatus;
  issueDescription: string;
  rejectionReason: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  skuSnapshot: string;
  orderReferenceSnapshot: string;
  createdAt: string;
  evidence: Array<{ id: string; imageUrl: string }>;
  history: Array<{
    id: string;
    newStatus: WarrantyClaimStatus;
    source: "CUSTOMER" | "ADMIN" | "SYSTEM";
    note: string | null;
    createdAt: string;
  }>;
};

export type UploadedWarrantyEvidence = {
  imageUrl: string;
  publicId?: string;
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
