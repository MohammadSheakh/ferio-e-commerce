import { withCorrelationId } from "@/lib/correlation";
import { hostForwardHeaders } from "@/lib/host-forward";

function getBackendApiUrl(): string {
  if (process.env.NEXT_PUBLIC_FERIO_API_URL) {
    return process.env.NEXT_PUBLIC_FERIO_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      return `${protocol}//${window.location.host}/api/v1`;
    }
  }
  return "http://localhost:6733/api/v1";
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string | string[];
  code?: string;
  correlationId?: string;
};

export class FerioApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "INTERNAL_ERROR",
    readonly correlationId?: string,
  ) {
    super(message);
  }
}

export async function getPublicApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Server components must forward the storefront host so the backend can
  // resolve the tenant; client components have nothing to forward.
  const tenantHeaders =
    typeof window === "undefined" ? await hostForwardHeaders() : {};
  const response = await fetch(
    `${getBackendApiUrl()}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: withCorrelationId({
        Accept: "application/json",
        ...tenantHeaders,
        ...init?.headers,
      }),
      ...(typeof window === "undefined" ? { cache: init?.cache ?? "no-store" } : {}),
    },
  );

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message;
    const baseMessage = message || "Ferio API request failed";
    const displayMessage = payload.correlationId
      ? `${baseMessage} Support reference: ${payload.correlationId}.`
      : baseMessage;
    throw new FerioApiError(
      displayMessage,
      response.status,
      payload.code,
      payload.correlationId,
    );
  }

  return payload.data;
}
