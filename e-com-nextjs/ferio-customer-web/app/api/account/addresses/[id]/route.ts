import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const result = await customerSessionFetch(`/account/commerce/addresses/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!result) {
    return bffErrorResponse(
      "Sign in to update address.",
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
      "Unable to update the address.",
    );
  }
  const payloadData = payload.data ?? payload;
  return NextResponse.json({ data: payloadData });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const result = await customerSessionFetch(`/account/commerce/addresses/${params.id}`, {
    method: "DELETE",
  });

  if (!result) {
    return bffErrorResponse(
      "Sign in to delete address.",
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
      "Unable to delete the address.",
    );
  }
  const payloadData = payload.data ?? payload;
  return NextResponse.json({ data: payloadData });
}
