import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@/lib/backend";
import type { OrderTracking } from "@/lib/tracking";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
} from "@/lib/bff-response";

const backendApiUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendApiUrl}/orders/track`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiEnvelope<OrderTracking> & {
      message?: string | string[];
    };
    if (!response.ok) {
      return backendErrorResponse(
        payload,
        response.status,
        "Order details could not be verified.",
      );
    }
    return NextResponse.json({ data: payload.data });
  } catch {
    return bffErrorResponse(
      "Tracking is temporarily unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
