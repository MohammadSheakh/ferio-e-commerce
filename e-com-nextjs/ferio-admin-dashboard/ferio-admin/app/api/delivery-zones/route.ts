import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { DeliveryZone } from "@/lib/delivery";

export async function GET() {
  try {
    const zones = await adminApi<DeliveryZone[]>("/admin/delivery-zones");
    return NextResponse.json({ data: zones });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load delivery zones.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const zone = await adminApi<DeliveryZone>("/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: zone }, { status: 201 });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to create delivery zone.";
    return NextResponse.json({ message }, { status });
  }
}
