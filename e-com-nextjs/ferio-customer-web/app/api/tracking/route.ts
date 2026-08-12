import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@/lib/backend";
import type { OrderTracking } from "@/lib/tracking";

const backendApiUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendApiUrl}/orders/track`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiEnvelope<OrderTracking> & {
      message?: string | string[];
    };
    if (!response.ok) {
      const message = Array.isArray(payload.message)
        ? payload.message.join(" ")
        : payload.message;
      return NextResponse.json(
        { message: message || "Order details could not be verified." },
        { status: response.status },
      );
    }
    return NextResponse.json({ data: payload.data });
  } catch {
    return NextResponse.json(
      { message: "Tracking is temporarily unavailable." },
      { status: 503 },
    );
  }
}
