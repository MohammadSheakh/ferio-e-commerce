import { NextResponse } from "next/server";
import {
  backendApiUrl,
  extractRefreshToken,
  setCustomerSession,
} from "@/lib/customer-session";
import { withCorrelationId } from "@/lib/correlation";
import { cookies } from "next/headers";
import { hostForwardHeadersFromRequest } from "@/lib/host-forward";

type BackendAuthPayload = {
  data?: { accessToken?: string; user?: unknown };
  message?: string | string[];
  code?: string;
  correlationId?: string;
};

export function backendMessage(
  payload: BackendAuthPayload,
  fallback: string,
) {
  return Array.isArray(payload.message)
    ? payload.message.join(" ")
    : payload.message || fallback;
}

export async function proxyCustomerSession(
  request: Request,
  path: string,
  body: Record<string, unknown>,
) {
  try {
    const tenantHeaders = hostForwardHeadersFromRequest(request);
    const upstream = await fetch(`${backendApiUrl}${path}`, {
      method: "POST",
      headers: withCorrelationId({
        ...tenantHeaders,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await upstream.json()) as BackendAuthPayload;
    if (!upstream.ok || !payload.data?.accessToken) {
      return NextResponse.json(
        {
          message: backendMessage(payload, "Authentication failed."),
          code: payload.code,
          correlationId: payload.correlationId,
        },
        { status: upstream.status },
      );
    }

    const refreshToken = extractRefreshToken(
      upstream.headers.get("set-cookie"),
    );
    if (!refreshToken) {
      return NextResponse.json(
        { message: "Authentication session could not be created." },
        { status: 502 },
      );
    }
    setCustomerSession(payload.data.accessToken, refreshToken);
    const cartToken = cookies().get("ferio_cart")?.value;
    let cartMerged = false;
    if (cartToken) {
      try {
        const merge = await fetch(`${backendApiUrl}/cart/merge`, {
          method: "POST",
          headers: withCorrelationId({
            ...tenantHeaders,
            Authorization: `Bearer ${payload.data.accessToken}`,
            "X-Cart-Token": cartToken,
          }),
          cache: "no-store",
        });
        cartMerged = merge.ok;
        if (merge.status === 409) {
          cookies().set("ferio_cart", "", { maxAge: 0, path: "/" });
        }
      } catch {
        cartMerged = false;
      }
    }
    return NextResponse.json({ data: payload.data.user, cartMerged });
  } catch {
    return NextResponse.json(
      { message: "The Ferio API is unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
