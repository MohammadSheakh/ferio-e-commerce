import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReconciliationQueueHealth } from "@/lib/settlements";

export async function GET() {
  try {
    const result = await adminApi<ReconciliationQueueHealth>(
      "/admin/reconciliation/queue-health",
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to load reconciliation queue health.",
    );
  }
}
