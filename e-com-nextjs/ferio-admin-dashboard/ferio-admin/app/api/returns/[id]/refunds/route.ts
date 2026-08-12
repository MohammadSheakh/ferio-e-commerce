import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CommerceRefund } from "@/lib/returns";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<CommerceRefund[]>(
      `/admin/returns/${params.id}/refunds`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load refunds.",
      },
      { status },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    const result = await adminApi<CommerceRefund>(
      `/admin/returns/${params.id}/refunds`,
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
          error instanceof Error ? error.message : "Unable to create refund.",
      },
      { status },
    );
  }
}
