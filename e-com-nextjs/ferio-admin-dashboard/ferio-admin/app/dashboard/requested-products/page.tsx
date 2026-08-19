import { adminApi } from "@/lib/admin-api";
import RequestedProductsClient, { ProductRequestItem } from "./RequestedProductsClient";

interface ApiResponse {
  results: ProductRequestItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function RequestedProductsPage() {
  let items: ProductRequestItem[] = [];
  let total = 0;

  try {
    const res = await adminApi<ApiResponse>("/product-requests?limit=100");
    items = res.results || [];
    total = res.pagination?.total || items.length;
  } catch {
    // Fallback if empty or server error
  }

  return <RequestedProductsClient initialItems={items} initialTotal={total} />;
}
