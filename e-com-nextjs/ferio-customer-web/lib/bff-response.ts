import { NextResponse } from "next/server";
import { withCorrelationId } from "@/lib/correlation";

export type BackendErrorPayload = {
  success?: boolean;
  message?: string | string[];
  code?: string;
  correlationId?: string;
};

export function forwardedHeaders(
  request: Request,
  headers?: HeadersInit,
): Headers {
  return withCorrelationId(
    headers,
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

export function backendErrorResponse(
  payload: BackendErrorPayload,
  status: number,
  fallback: string,
) {
  const message = Array.isArray(payload.message)
    ? payload.message.join(" ")
    : payload.message || fallback;
  return bffErrorResponse(
    message,
    status,
    payload.code || "INTERNAL_ERROR",
    payload.correlationId,
  );
}

export async function proxyBackendResponse(
  response: Response,
  fallback: string,
) {
  const payload = (await response.json().catch(() => ({}))) as BackendErrorPayload;
  if (!response.ok) {
    return backendErrorResponse(
      {
        ...payload,
        correlationId:
          payload.correlationId || response.headers.get("x-correlation-id") || undefined,
      },
      response.status,
      fallback,
    );
  }
  return NextResponse.json(payload, { status: response.status });
}
