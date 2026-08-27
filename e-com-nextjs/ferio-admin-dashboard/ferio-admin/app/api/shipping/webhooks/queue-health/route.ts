import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CourierWebhookQueueHealth } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CourierWebhookQueueHealth>(
        "/admin/shipping/webhooks/queue-health",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load callback retry health.");
  }
}
