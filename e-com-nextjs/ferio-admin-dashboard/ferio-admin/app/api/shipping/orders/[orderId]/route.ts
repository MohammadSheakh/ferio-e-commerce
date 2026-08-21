import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { Shipment } from "@/lib/shipping";

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi<Shipment | null>(
        `/admin/shipping/orders/${params.orderId}`,
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load shipment.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    const body = await request.json();
    const shipment = await adminApi<Shipment>(
      `/admin/shipping/orders/${params.orderId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: shipment }, { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to create shipment.");
  }
}
