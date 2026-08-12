import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
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
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load shipment." },
      { status },
    );
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
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create shipment." },
      { status },
    );
  }
}
