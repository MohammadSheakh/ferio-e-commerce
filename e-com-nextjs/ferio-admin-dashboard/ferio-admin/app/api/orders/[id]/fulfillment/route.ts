import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { OrderDetail } from "@/lib/orders";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const order = await adminApi<OrderDetail>(
      `/admin/orders/${params.id}/fulfillment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await request.json()),
      },
    );
    return NextResponse.json({ data: order });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to update fulfillment.";
    return NextResponse.json({ message }, { status });
  }
}
