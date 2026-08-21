import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function POST(
  request: Request,
  { params }: { params: { productId: string } },
) {
  const result = await customerSessionFetch(
    `/product-content/${params.productId}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
    },
  );
  if (!result) {
    return bffErrorResponse(
      "Sign in to submit a review.",
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
      "Unable to submit the review.",
    );
  }
  return NextResponse.json({ data: payload.data });
}
