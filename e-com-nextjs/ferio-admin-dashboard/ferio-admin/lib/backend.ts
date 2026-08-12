const backendApiUrl =
  process.env.FERIO_API_URL ?? "http://localhost:6733/api/v1";

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string | string[];
  error?: string;
};

export function getBackendUrl(path: string): string {
  return `${backendApiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getApiMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Unable to complete the request.";
  }

  const message = (payload as ApiEnvelope<unknown>).message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;

  return "Unable to complete the request.";
}
