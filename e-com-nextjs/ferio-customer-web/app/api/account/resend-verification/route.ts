import { NextResponse } from "next/server";
import { backendMessage } from "@/lib/customer-auth-proxy";
import { backendApiUrl } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email;
  } catch {
    return bffErrorResponse(
      "Enter a valid email.",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (!email) {
    return bffErrorResponse("Email is required.", 400, "VALIDATION_ERROR");
  }

  try {
    const upstream = await fetch(
      `${backendApiUrl}/auth/resend-verification`,
      {
        method: "POST",
        headers: forwardedHeaders(request, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ email }),
        cache: "no-store",
      },
    );
    const payload = (await upstream.json()) as BackendErrorPayload;
    if (!upstream.ok) {
      return backendErrorResponse(
        payload,
        upstream.status,
        backendMessage(payload, "Unable to resend the code."),
      );
    }
    return NextResponse.json({
      message: backendMessage(payload, "Verification code sent."),
    });
  } catch {
    return bffErrorResponse(
      "The Ferio API is unavailable. Try again shortly.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
