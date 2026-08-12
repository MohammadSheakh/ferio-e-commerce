import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ShipmentProvider } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<ShipmentProvider[]>("/admin/shipping/providers"),
    });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load courier providers." },
      { status },
    );
  }
}
