import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function PUT(request: Request) {
  const body = JSON.stringify(await request.json());
  const result = await customerSessionFetch("/account/commerce/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!result) {
    return bffErrorResponse(
      "Sign in to update your account.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  const payload = (await result.response.json()) as BackendErrorPayload & {
    data?: Record<string, unknown>;
    account?: unknown;
    linked?: unknown;
    customer?: unknown;
  };
  if (!result.response.ok) {
    return backendErrorResponse(
      payload,
      result.response.status,
      "Unable to update the customer account.",
    );
  }

  const payloadData = payload.data ?? payload;
  return NextResponse.json({
    data: payloadData,
    account: payloadData.account ?? payload.account,
    linked: payloadData.linked ?? payload.linked,
    customer: payloadData.customer ?? payload.customer,
  });
}
