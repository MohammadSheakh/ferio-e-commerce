import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { OrderDetail } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const order = await adminApi<OrderDetail>(`/admin/orders/${params.id}`);
    return NextResponse.json({ data: order });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load order.");
  }
}
