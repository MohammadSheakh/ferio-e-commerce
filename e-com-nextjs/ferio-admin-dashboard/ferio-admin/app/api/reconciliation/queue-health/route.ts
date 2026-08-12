import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReconciliationQueueHealth } from "@/lib/settlements";

export async function GET() {
  try {
    const result = await adminApi<ReconciliationQueueHealth>(
      "/admin/reconciliation/queue-health",
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load reconciliation queue health.",
      },
      { status },
    );
  }
}
