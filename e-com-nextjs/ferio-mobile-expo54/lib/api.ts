const API_URL = process.env.EXPO_PUBLIC_FERIO_API_URL?.replace(/\/$/, "");

let currentAuthToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function setAuthRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string | string[];
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  retryAuth?: boolean;
};

function formatPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function messageFromPayload(payload: any, fallback: string) {
  const message = payload?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, `Ferio API ${response.status}: ${path}`));
  }
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_FERIO_API_URL is not configured");
  const method = options.method || "GET";
  const execute = (token: string | null) =>
    fetch(`${API_URL}${formatPath(path)}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  const token = options.token === undefined ? currentAuthToken : options.token;
  let response = await execute(token);
  const canRefresh = options.retryAuth !== false && !path.startsWith("/auth/");
  if (response.status === 401 && canRefresh && refreshHandler) {
    refreshPromise ||= refreshHandler().finally(() => {
      refreshPromise = null;
    });
    const nextToken = await refreshPromise;
    if (nextToken) response = await execute(nextToken);
  }
  return parseResponse<T>(response, path);
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiGetWithToken<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, { token, retryAuth: false });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}
