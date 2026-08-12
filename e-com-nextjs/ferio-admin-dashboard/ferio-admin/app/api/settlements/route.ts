import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CourierSettlement } from "@/lib/settlements";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CourierSettlement[]>("/admin/settlements"),
    });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load settlements.",
      },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    const result = await adminApi<CourierSettlement>("/admin/settlements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to record settlement.",
      },
      { status },
    );
  }
}
