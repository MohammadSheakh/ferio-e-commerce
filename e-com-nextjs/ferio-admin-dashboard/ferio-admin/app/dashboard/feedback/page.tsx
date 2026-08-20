import { adminApi } from "@/lib/admin-api";
import FeedbackClient, { FeedbackItem } from "./FeedbackClient";

interface ApiResponse {
  results: FeedbackItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default async function FeedbackPage() {
  let items: FeedbackItem[] = [];
  let total = 0;

  try {
    const res = await adminApi<ApiResponse>("/product-requests?limit=100");
    items = res.results || [];
    total = res.pagination?.total || items.length;
  } catch {
    // Fallback if server error or unauthenticated during SSR
  }

  return <FeedbackClient initialItems={items} initialTotal={total} />;
}
