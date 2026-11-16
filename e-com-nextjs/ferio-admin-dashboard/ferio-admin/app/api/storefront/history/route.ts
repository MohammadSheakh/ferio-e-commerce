import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const history = await adminApi("/admin/storefront/pages/home/history");
    return NextResponse.json({ data: history });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load version history.");
  }
}

