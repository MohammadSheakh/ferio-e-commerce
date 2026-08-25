import { cookies } from "next/headers";
import { hostForwardHeaders } from "@/lib/host-forward";
import { withCorrelationId } from "@/lib/correlation";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

const ACCESS_COOKIE_MAX_AGE = 15 * 60;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export type CustomerSessionResult = {
  response: Response;
  rotated: boolean;
};

function extractRefreshToken(setCookie: string | null) {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

export function setCustomerSession(accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === "production";
  const store = cookies();
  store.set("ferio_customer_access", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
  });
  store.set("ferio_customer_refresh", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearCustomerSession() {
  const store = cookies();
  store.set("ferio_customer_access", "", { maxAge: 0, path: "/" });
  store.set("ferio_customer_refresh", "", { maxAge: 0, path: "/" });
}

export async function refreshCustomerSession() {
  const refreshToken = cookies().get("ferio_customer_refresh")?.value;
  if (!refreshToken) return null;
  try {
    const upstream = await fetch(`${backendApiUrl}/auth/refresh`, {
      method: "POST",
      headers: withCorrelationId({ Cookie: `refreshToken=${refreshToken}` }),
      cache: "no-store",
    });
    const payload = (await upstream.json()) as {
      data?: { accessToken?: string };
    };
    const nextRefreshToken = extractRefreshToken(
      upstream.headers.get("set-cookie"),
    );
    if (!upstream.ok || !payload.data?.accessToken || !nextRefreshToken) {
      clearCustomerSession();
      return null;
    }
    setCustomerSession(payload.data.accessToken, nextRefreshToken);
    return payload.data.accessToken;
  } catch {
    return null;
  }
}

export async function customerSessionFetch(
  path: string,
  init?: RequestInit,
): Promise<CustomerSessionResult | null> {
  let accessToken = cookies().get("ferio_customer_access")?.value;
  if (!accessToken) accessToken = (await refreshCustomerSession()) ?? undefined;
  if (!accessToken) return null;
  const call = async (token: string) =>
    fetch(`${backendApiUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers: withCorrelationId({
        Authorization: `Bearer ${token}`,
        ...(await hostForwardHeaders()),
        ...init?.headers,
      }),
      cache: "no-store",
    });
  let response = await call(accessToken);
  if (response.status !== 401) return { response, rotated: false };
  const nextAccessToken = await refreshCustomerSession();
  if (!nextAccessToken) return { response, rotated: false };
  response = await call(nextAccessToken);
  return { response, rotated: true };
}

export { backendApiUrl, extractRefreshToken };
