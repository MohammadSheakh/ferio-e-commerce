import { cookies } from "next/headers";
import { ApiEnvelope, getApiMessage, getBackendUrl } from "@/lib/backend";
import { withCorrelationId } from "@/lib/correlation";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "INTERNAL_ERROR",
    readonly correlationId?: string,
  ) {
    super(message);
  }
}

function extractRefreshToken(setCookie: string | null): string | null {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

async function refreshAdminSession(): Promise<string | null> {
  const store = cookies();
  const refreshToken = store.get("ferio_admin_refresh")?.value;
  if (!refreshToken) return null;

  try {
    const response = await fetch(getBackendUrl("/auth/refresh"), {
      method: "POST",
      headers: withCorrelationId({ Cookie: `refreshToken=${refreshToken}` }),
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiEnvelope<{
      accessToken?: string;
    }>;
    const nextRefreshToken = extractRefreshToken(
      response.headers.get("set-cookie"),
    );

    if (!response.ok || !payload.data?.accessToken || !nextRefreshToken) {
      return null;
    }

    const secure = process.env.NODE_ENV === "production";
    try {
      store.set("ferio_admin_access", payload.data.accessToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 15 * 60,
        path: "/",
      });
      store.set("ferio_admin_refresh", nextRefreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    } catch {
      return payload.data.accessToken;
    }

    return payload.data.accessToken;
  } catch {
    return null;
  }
}

async function callAdminApi(
  path: string,
  token: string,
  init?: RequestInit,
) {
  return fetch(getBackendUrl(path), {
    ...init,
    headers: withCorrelationId({
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    }),
    cache: "no-store",
  });
}

export async function adminApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = cookies().get("ferio_admin_access")?.value;
  if (!accessToken) {
    throw new AdminApiError(
      "Admin session is required.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  let response = await callAdminApi(path, accessToken, init);
  if (response.status === 401) {
    const nextAccessToken = await refreshAdminSession();
    if (nextAccessToken) {
      response = await callAdminApi(path, nextAccessToken, init);
    }
  }
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || payload.data === undefined) {
    throw new AdminApiError(
      getApiMessage(payload),
      response.status,
      payload.code,
      payload.correlationId,
    );
  }

  return payload.data;
}
