import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CourierScorecardRow } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CourierScorecardRow[]>("/admin/shipping/scorecard"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load courier scorecard.");
  }
}
