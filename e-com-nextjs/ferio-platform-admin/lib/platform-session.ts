import { cookies } from "next/headers";

export const PLATFORM_TOKEN_COOKIE = "ferio_platform_token";

export function platformApiUrl(): string {
  return (
    process.env.PLATFORM_API_URL ?? "http://localhost:6733/api/v1"
  );
}

/** Server-side control-plane call with the operator's httpOnly session token. */
export async function platformApi<T>(
  path: string,
  init?: RequestInit & { raw?: boolean },
): Promise<T> {
  const token = cookies().get(PLATFORM_TOKEN_COOKIE)?.value;
  if (!token) {
    throw Object.assign(new Error("PLATFORM_AUTH_REQUIRED"), { status: 401 });
  }
  const response = await fetch(
    `${platformApiUrl()}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
    data?: T;
    message?: string;
  };
  if (!response.ok) {
    throw Object.assign(
      new Error(payload.message || "Platform request failed."),
      { status: response.status },
    );
  }
  return (payload.data ?? (payload as unknown)) as T;
}
