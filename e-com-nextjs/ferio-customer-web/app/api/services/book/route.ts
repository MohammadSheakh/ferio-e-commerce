import { NextResponse } from "next/server";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";

const api =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const response = await fetch(`${api}/services/bookings/request`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(await request.json()),
    });
    const payload = (await response.json()) as BackendErrorPayload & {
      data?: unknown;
    };
    if (!response.ok) {
      return backendErrorResponse(
        payload,
        response.status,
        "Unable to request the service booking.",
      );
    }
    return NextResponse.json({ data: payload.data });
  } catch {
    return bffErrorResponse(
      "The service booking API is unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
