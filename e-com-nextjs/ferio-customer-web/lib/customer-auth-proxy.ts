import { NextResponse } from "next/server";
import {
  backendApiUrl,
  extractRefreshToken,
  setCustomerSession,
} from "@/lib/customer-session";

type BackendAuthPayload = {
  data?: { accessToken?: string; user?: unknown };
  message?: string | string[];
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
  path: string,
  body: Record<string, unknown>,
) {
  try {
    const upstream = await fetch(`${backendApiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await upstream.json()) as BackendAuthPayload;
    if (!upstream.ok || !payload.data?.accessToken) {
      return NextResponse.json(
        { message: backendMessage(payload, "Authentication failed.") },
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
    return NextResponse.json({ data: payload.data.user });
  } catch {
    return NextResponse.json(
      { message: "The Ferio API is unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
