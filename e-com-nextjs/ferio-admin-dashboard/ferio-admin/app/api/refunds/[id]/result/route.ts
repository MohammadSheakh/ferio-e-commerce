import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceRefund } from "@/lib/returns";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    const result = await adminApi<CommerceRefund>(
      `/admin/refunds/${params.id}/result`,
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
    return adminApiErrorResponse(error, "Unable to record refund result.");
  }
}
