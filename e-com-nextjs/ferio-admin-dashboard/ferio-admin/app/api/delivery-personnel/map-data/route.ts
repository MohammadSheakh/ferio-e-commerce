import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function GET() {
  try {
    const data = await adminApi("/delivery-personnel/admin/map-data");
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load map data." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
