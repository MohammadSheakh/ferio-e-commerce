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

export async function GET(request: Request) {
  try {
    const res = await fetch(`${backendApiUrl}/store-locations`, {
      headers: forwardedHeaders(request, { Accept: "application/json" }),
      cache: "no-store",
    });
    if (!res.ok) {
      const payload = (await res.json()) as BackendErrorPayload;
      return backendErrorResponse(
        payload,
        res.status,
        "Failed to fetch store locations.",
      );
    }
    const data = await res.json();
    return NextResponse.json({ data: data.data || data });
  } catch {
    return bffErrorResponse(
      "Unable to load store locations.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
