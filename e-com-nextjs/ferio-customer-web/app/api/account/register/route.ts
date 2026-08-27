import { NextResponse } from "next/server";
import {
  backendMessage,
} from "@/lib/customer-auth-proxy";
import { backendApiUrl } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
  };
  try {
    body = await request.json();
  } catch {
    return bffErrorResponse(
      "Enter valid account details.",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (!body.name || !body.email || !body.password) {
    return bffErrorResponse(
      "Name, email, and password are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  try {
    const upstream = await fetch(`${backendApiUrl}/auth/register`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await upstream.json()) as BackendErrorPayload & {
      user?: { email?: string };
      otp?: string;
    };
    if (!upstream.ok) {
      return backendErrorResponse(
        payload,
        upstream.status,
        backendMessage(payload, "Account creation failed."),
      );
    }
    return NextResponse.json({
      data: {
        email: payload.user?.email || body.email,
        message: payload.message || "Check your email for a verification code.",
        // Verification codes never reach the browser — even in development.
        // Use the backend email inbox/logs to read the dev code instead.
      },
    });
  } catch {
    return bffErrorResponse(
      "The Ferio API is unavailable. Try again shortly.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
