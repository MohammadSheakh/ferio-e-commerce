import { NextResponse } from "next/server";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";
import {
  RIDER_TOKEN_COOKIE,
  riderSessionCookieOptions,
} from "@/lib/rider-session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return bffErrorResponse(
        "Email or phone and password are required.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = (await res.json()) as BackendErrorPayload & {
      data?: { accessToken?: string; user?: unknown };
    };
    if (!res.ok || !data.data?.accessToken) {
      return backendErrorResponse(
        data,
        res.status || 401,
        "Rider login failed. Invalid credentials.",
      );
    }

    // The rider JWT is stored in an httpOnly cookie and never returned to
    // client JavaScript.
    const response = NextResponse.json({ user: data.data.user });
    response.cookies.set(
      RIDER_TOKEN_COOKIE,
      data.data.accessToken,
      riderSessionCookieOptions(),
    );
    return response;
  } catch {
    return bffErrorResponse(
      "The Ferio backend server is unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
