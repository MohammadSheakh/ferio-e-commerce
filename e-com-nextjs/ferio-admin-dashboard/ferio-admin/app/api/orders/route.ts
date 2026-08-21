import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { OrderPage } from "@/lib/orders";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const orders = await adminApi<OrderPage>(`/admin/orders${query}`);
    return NextResponse.json({ data: orders });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load orders.");
  }
}
