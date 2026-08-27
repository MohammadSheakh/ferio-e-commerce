import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ShipmentProvider } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<ShipmentProvider[]>("/admin/shipping/providers"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load courier providers.");
  }
}
