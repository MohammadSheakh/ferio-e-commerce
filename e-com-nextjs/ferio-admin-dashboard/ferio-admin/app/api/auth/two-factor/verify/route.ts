import { NextResponse } from "next/server";
import { ApiEnvelope, getApiMessage, getBackendUrl } from "@/lib/backend";
import { bffErrorResponse, forwardedHeaders } from "@/lib/bff-response";

function extractRefreshToken(setCookie: string | null): string | null {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    const upstream = await fetch(getBackendUrl("/auth/admin/2fa/verify"), {
      method: "POST",
      headers: forwardedHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await upstream.json()) as ApiEnvelope<{
      accessToken: string;
      user: unknown;
    }>;
    if (!upstream.ok || !payload.data?.accessToken) {
      return bffErrorResponse(
        getApiMessage(payload),
        upstream.status,
        payload.code || "AUTHENTICATION_FAILED",
        payload.correlationId,
      );
    }
    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (!refreshToken) {
      return bffErrorResponse(
        "Authentication session could not be created.",
        502,
        "UPSTREAM_ERROR",
      );
    }
    const response = NextResponse.json({ user: payload.data.user });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("ferio_admin_access", payload.data.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });
    response.cookies.set("ferio_admin_refresh", refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    return bffErrorResponse(
      "The Ferio API is unavailable. Try again shortly.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
