const API_URL = process.env.EXPO_PUBLIC_FERIO_API_URL?.replace(/\/$/, "");

let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function formatPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_FERIO_API_URL is not configured");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (currentAuthToken) {
    headers["Authorization"] = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(`${API_URL}${formatPath(path)}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    const msg = Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message;
    throw new Error(msg || `Ferio API ${response.status}: ${path}`);
  }
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_FERIO_API_URL is not configured");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (currentAuthToken) {
    headers["Authorization"] = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(`${API_URL}${formatPath(path)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const msg = Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message;
    throw new Error(msg || `Ferio API ${response.status}: ${path}`);
  }
  if (payload && typeof payload === "object" && "data" in payload && "success" in payload) {
    return payload.data as T;
  }
  return payload as T;
}
