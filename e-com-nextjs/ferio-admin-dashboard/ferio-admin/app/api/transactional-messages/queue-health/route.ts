import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { TransactionalMessageQueueHealth } from "@/lib/transactional-messages";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<TransactionalMessageQueueHealth>(
        "/admin/transactional-messages/queue-health",
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load message queue health." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
