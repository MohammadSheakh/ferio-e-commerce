import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { OrderDetail } from "@/lib/orders";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const order = await adminApi<OrderDetail>(
      `/admin/orders/${params.id}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: order });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to cancel order.";
    return NextResponse.json({ message }, { status });
  }
}
