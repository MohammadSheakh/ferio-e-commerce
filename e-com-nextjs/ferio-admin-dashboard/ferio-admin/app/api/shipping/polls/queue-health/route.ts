import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ShipmentPollingQueueHealth } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<ShipmentPollingQueueHealth>(
        "/admin/shipping/polls/queue-health",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load courier polling health.");
  }
}
