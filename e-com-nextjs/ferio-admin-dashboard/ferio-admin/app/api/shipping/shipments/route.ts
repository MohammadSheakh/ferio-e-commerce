import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { Shipment } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<Shipment[]>("/admin/shipping/shipments"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load shipments.");
  }
}
