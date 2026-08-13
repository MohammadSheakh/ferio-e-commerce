import { getPublicApi } from "@/lib/backend";

export type PurchaseActivityItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  additionalItemCount: number;
  customerName: string;
  location: string | null;
  purchasedAt: string;
  verifiedPurchase: true;
};

export type PurchaseActivityPage = {
  items: PurchaseActivityItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  settings: {
    activityEnabled: boolean;
    historyEnabled: boolean;
    displayDurationMs: number;
    intervalSeconds: number;
  };
};

export function getPurchaseActivity(page = 1, limit = 12, surface = "history") {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    surface,
  });
  return getPublicApi<PurchaseActivityPage>(`/purchase-activity?${query}`, {
    cache: "no-store",
  });
}

export function relativePurchaseTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}
