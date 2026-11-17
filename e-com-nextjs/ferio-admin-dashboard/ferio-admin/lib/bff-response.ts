import { NextResponse } from "next/server";
import { parseApiEnvelope } from "@/lib/backend";
import { withCorrelationId } from "@/lib/correlation";
import { AdminApiError } from "@/lib/admin-api";
import { tenantHostHeadersFromRequest } from "@/lib/tenant-host";

export function forwardedHeaders(
  request: Request,
  headers?: HeadersInit,
): Headers {
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const ipHeaders: Record<string, string> = {};
  if (clientIp) {
    ipHeaders["x-forwarded-for"] = request.headers.get("x-forwarded-for") || clientIp;
    ipHeaders["x-real-ip"] = clientIp;
    ipHeaders["cf-connecting-ip"] = clientIp;
  }

  return withCorrelationId(
    {
      ...tenantHostHeadersFromRequest(request),
      ...ipHeaders,
      ...Object.fromEntries(new Headers(headers).entries()),
    },
    request.headers.get("x-correlation-id") ??
      request.headers.get("x-request-id") ??
      undefined,
  );
}

export function bffErrorResponse(
  message: string,
  status: number,
  code: string,
  correlationId?: string,
) {
  return NextResponse.json(
    { success: false, message, code, correlationId },
    { status },
  );
}

export function adminApiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    return bffErrorResponse(
      error.message,
      error.status,
      error.code,
      error.correlationId,
    );
  }
  return bffErrorResponse(fallback, 503, "SERVICE_UNAVAILABLE");
}

export async function proxyBackendResponse(
  response: Response,
  fallback: string,
) {
  const payload = parseApiEnvelope<unknown>(await response.json().catch(() => null));
  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message || fallback;
    return bffErrorResponse(
      message,
      response.status,
      payload.code || "INTERNAL_ERROR",
      payload.correlationId || response.headers.get("x-correlation-id") || undefined,
    );
  }
  return NextResponse.json(payload, { status: response.status });
}
