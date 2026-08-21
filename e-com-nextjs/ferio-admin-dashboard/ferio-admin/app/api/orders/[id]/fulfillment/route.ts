import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
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
    return adminApiErrorResponse(error, "Unable to update fulfillment.");
  }
}
