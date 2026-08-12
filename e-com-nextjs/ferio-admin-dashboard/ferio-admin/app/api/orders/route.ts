import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { OrderPage } from "@/lib/orders";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const orders = await adminApi<OrderPage>(`/admin/orders${query}`);
    return NextResponse.json({ data: orders });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to load orders.";
    return NextResponse.json({ message }, { status });
  }
}
