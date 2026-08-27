import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const data = await adminApi(`/storefront-analytics/dashboard${query}`);
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load analytics data.");
  }
}
