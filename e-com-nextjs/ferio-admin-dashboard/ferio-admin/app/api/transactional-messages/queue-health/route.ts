import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { TransactionalMessageQueueHealth } from "@/lib/transactional-messages";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<TransactionalMessageQueueHealth>(
        "/admin/transactional-messages/queue-health",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load message queue health.");
  }
}
