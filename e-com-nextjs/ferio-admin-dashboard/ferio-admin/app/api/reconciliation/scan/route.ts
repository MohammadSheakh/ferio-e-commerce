import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReconciliationRun } from "@/lib/settlements";

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    const result = await adminApi<ReconciliationRun>(
      "/admin/reconciliation/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(await request.json()),
      },
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to run reconciliation scan.",
      },
      { status },
    );
  }
}
