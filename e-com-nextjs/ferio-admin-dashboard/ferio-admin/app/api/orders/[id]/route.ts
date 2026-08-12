import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { OrderDetail } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const order = await adminApi<OrderDetail>(`/admin/orders/${params.id}`);
    return NextResponse.json({ data: order });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to load order.";
    return NextResponse.json({ message }, { status });
  }
}
