import { NextResponse } from "next/server";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${backendApiUrl}/store-locations/check-availability`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const payload = (await res.json()) as BackendErrorPayload;
      return backendErrorResponse(
        payload,
        res.status,
        "Failed to check store availability.",
      );
    }
    const data = await res.json();
    return NextResponse.json({ data: data.data || data });
  } catch {
    return bffErrorResponse(
      "Unable to check store availability.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
