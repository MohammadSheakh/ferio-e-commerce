import { NextResponse } from "next/server";
import { PLATFORM_TOKEN_COOKIE, platformApiUrl } from "@/lib/platform-session";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }
  const backendUrl =
    process.env.PLATFORM_API_URL ?? "http://localhost:6733/api/v1";
  const res = await fetch(`${backendUrl}/platform/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    data?: {
      accessToken?: string;
    };
    message?: string;
  };
  const accessToken = data.accessToken ?? data.data?.accessToken;
  if (!res.ok || !accessToken) {
    return NextResponse.json(
      { message: data.message || "Platform sign-in failed." },
      { status: res.ok ? 401 : res.status || 401 },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PLATFORM_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  return response;
}
