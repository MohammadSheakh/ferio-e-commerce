import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

async function call(request: Request, method: "GET" | "POST") {
  const body = method === "POST" ? JSON.stringify(await request.json()) : undefined;
  const result = await customerSessionFetch(
    `/account/commerce${method === "POST" ? "/link" : ""}`,
    {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    },
  );
  if (!result) {
    return bffErrorResponse(
      "Sign in to view your account.",
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
      "Unable to load the customer account.",
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

export const GET = (request: Request) => call(request, "GET");
export const POST = (request: Request) => call(request, "POST");
