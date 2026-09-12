import { NextResponse } from "next/server";
import {
  backendErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";
import { fallbackStoreConfig } from "@/lib/store";

// Store configuration is tenant-host dependent. Never let Next.js turn this
// BFF route into a build-time/static response for the first host that renders.
export const dynamic = "force-dynamic";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${backendApiUrl}/store/config`, {
      headers: forwardedHeaders(request, { Accept: "application/json" }),
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as BackendErrorPayload;
      return backendErrorResponse(payload, response.status, "Failed to fetch store configuration.");
    }
    const payload = (await response.json()) as { data?: unknown };
    return NextResponse.json({ data: payload.data ?? payload });
  } catch {
    // Keep the public contract stable while making transport failure explicit.
    return NextResponse.json(
      {
        success: false,
        data: fallbackStoreConfig,
        message: "Unable to load store configuration.",
        code: "SERVICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
