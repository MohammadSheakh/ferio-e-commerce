import { NextResponse } from "next/server";
import {
  backendErrorResponse,
  bffErrorResponse,
  forwardedHeaders,
  type BackendErrorPayload,
} from "@/lib/bff-response";

const backendUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendUrl}/delivery-personnel/apply`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as BackendErrorPayload;

    if (!response.ok) {
      return backendErrorResponse(
        payload,
        response.status,
        "Application failed.",
      );
    }

    return NextResponse.json({ data: payload });
  } catch {
    return bffErrorResponse(
      "The application service is unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
