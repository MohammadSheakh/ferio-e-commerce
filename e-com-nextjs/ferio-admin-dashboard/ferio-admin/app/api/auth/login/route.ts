import { NextResponse } from "next/server";
import {
  ApiEnvelope,
  getApiMessage,
  getBackendUrl,
} from "@/lib/backend";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin";
};

type LoginResult = {
  user: AdminUser;
  accessToken: string;
};

function extractRefreshToken(setCookie: string | null): string | null {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

export async function POST(request: Request) {
  let credentials: { email?: string; password?: string };

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Enter a valid email and password." },
      { status: 400 },
    );
  }

  if (!credentials.email || !credentials.password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(getBackendUrl("/auth/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    const payload = (await upstream.json()) as ApiEnvelope<LoginResult>;

    if (!upstream.ok || !payload.data) {
      return NextResponse.json(
        { message: getApiMessage(payload) },
        { status: upstream.status },
      );
    }

    const refreshToken = extractRefreshToken(upstream.headers.get("set-cookie"));
    if (!refreshToken) {
      return NextResponse.json(
        { message: "Authentication session could not be created." },
        { status: 502 },
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
    return NextResponse.json(
      { message: "The Ferio API is unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
