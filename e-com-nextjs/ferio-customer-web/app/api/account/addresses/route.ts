import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await customerSessionFetch("/account/commerce/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!result) {
    return bffErrorResponse(
      "Sign in to add an address.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }
  const payload = (await result.response.json()) as BackendErrorPayload & {
    data?: unknown;
  };
  if (!result.response.ok) {
    return backendErrorResponse(
      payload,
      result.response.status,
      "Unable to add the address.",
    );
  }
  const payloadData = payload.data ?? payload;
  return NextResponse.json({ data: payloadData });
}
