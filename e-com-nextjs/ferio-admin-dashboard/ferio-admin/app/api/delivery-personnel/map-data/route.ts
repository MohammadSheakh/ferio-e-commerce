import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const data = await adminApi("/delivery-personnel/admin/map-data");
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load map data.");
  }
}
