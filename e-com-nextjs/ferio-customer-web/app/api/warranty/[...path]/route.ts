import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

async function call(request: Request, path: string[], method: "GET" | "POST") {
  const multipart = request.headers
    .get("content-type")
    ?.includes("multipart/form-data");
  const body =
    method === "GET"
      ? undefined
      : multipart
        ? await request.formData()
        : JSON.stringify(await request.json());
  const result = await customerSessionFetch(`/warranty/${path.join("/")}`, {
    method,
    headers:
      !multipart && body ? { "Content-Type": "application/json" } : undefined,
    body,
  });
  if (!result) {
    return bffErrorResponse(
      "Sign in to use warranty claims.",
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
      "Unable to process the warranty request.",
    );
  }
  return NextResponse.json({ data: payload.data });
}

export const GET = (
  request: Request,
  context: { params: { path: string[] } },
) => call(request, context.params.path, "GET");
export const POST = (
  request: Request,
  context: { params: { path: string[] } },
) => call(request, context.params.path, "POST");
