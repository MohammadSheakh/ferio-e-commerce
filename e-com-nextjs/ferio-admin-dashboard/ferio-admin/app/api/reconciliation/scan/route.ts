import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
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
    return adminApiErrorResponse(error, "Unable to run reconciliation scan.");
  }
}
