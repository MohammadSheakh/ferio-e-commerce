import { NextResponse } from "next/server";
import {
  ApiEnvelope,
  getApiMessage,
  getBackendUrl,
} from "@/lib/backend";
import {
  bffErrorResponse,
  forwardedHeaders,
} from "@/lib/bff-response";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  permissions?: string[];
};

type LoginResult = {
  user?: AdminUser;
  accessToken?: string;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
};

function extractRefreshToken(setCookie: string | null): string | null {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

export async function POST(request: Request) {
  let credentials: { email?: string; password?: string };

  try {
    credentials = await request.json();
  } catch {
    return bffErrorResponse(
      "Enter a valid email and password.",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (!credentials.email || !credentials.password) {
    return bffErrorResponse(
      "Email and password are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  try {
    const upstream = await fetch(getBackendUrl("/auth/admin/login"), {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    const payload = (await upstream.json()) as ApiEnvelope<LoginResult>;

    if (!upstream.ok || !payload.data) {
      return NextResponse.json(
        {
          message: getApiMessage(payload),
          code: payload.code,
          correlationId: payload.correlationId,
        },
        { status: upstream.status },
      );
    }

    if (payload.data.requiresTwoFactor && payload.data.challengeToken) {
      return NextResponse.json({
        requiresTwoFactor: true,
        challengeToken: payload.data.challengeToken,
      });
    }

    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (!refreshToken || !payload.data.accessToken || !payload.data.user) {
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
