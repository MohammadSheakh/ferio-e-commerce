import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { DeliveryZone } from "@/lib/delivery";

export async function GET() {
  try {
    const zones = await adminApi<DeliveryZone[]>("/admin/delivery-zones");
    return NextResponse.json({ data: zones });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load delivery zones.");
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
    return adminApiErrorResponse(error, "Unable to create delivery zone.");
  }
}
