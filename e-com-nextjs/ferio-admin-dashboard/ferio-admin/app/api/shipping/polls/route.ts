import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ShipmentPollAttempt } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<ShipmentPollAttempt[]>("/admin/shipping/polls"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load courier poll evidence.");
  }
}
