const backendApiUrl =
  process.env.FERIO_API_URL ?? "http://localhost:6733/api/v1";

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string | string[];
  error?: string;
  code?: string;
  correlationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseApiEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  if (!isRecord(payload)) {
    return { success: false };
  }

  const message = Array.isArray(payload.message)
    ? payload.message.filter((item): item is string => typeof item === "string")
    : typeof payload.message === "string"
      ? payload.message
      : undefined;

  return {
    success: payload.success === true,
    ...(payload.data !== undefined ? { data: payload.data as T } : {}),
    ...(message !== undefined ? { message } : {}),
    ...(typeof payload.error === "string" ? { error: payload.error } : {}),
    ...(typeof payload.code === "string" ? { code: payload.code } : {}),
    ...(typeof payload.correlationId === "string"
      ? { correlationId: payload.correlationId }
      : {}),
  };
}

export function getBackendUrl(path: string): string {
  return `${backendApiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getApiMessage(payload: unknown): string {
  if (!isRecord(payload)) {
    return "Unable to complete the request.";
  }

  const message = payload.message;
  const text = Array.isArray(message)
    ? message.join(" ")
    : typeof message === "string"
      ? message
      : "Unable to complete the request.";
  const correlationId = payload.correlationId;

  return correlationId ? `${text} Support reference: ${correlationId}.` : text;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
