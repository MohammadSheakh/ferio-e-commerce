import { NextResponse } from "next/server";
import {
  backendApiUrl,
  customerSessionFetch,
} from "@/lib/customer-session";
import {
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { guestId?: string };
  const authenticated = await customerSessionFetch("/socket-auth/ticket", {
    method: "POST",
  });

  if (authenticated?.response.ok) {
    const payload = await authenticated.response.json();
    return NextResponse.json(payload);
  }

  const guestResponse = await fetch(`${backendApiUrl}/socket-auth/guest-ticket`, {
    method: "POST",
    headers: forwardedHeaders(request, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ guestId: body.guestId }),
    cache: "no-store",
  });
  return proxyBackendResponse(
    guestResponse,
    "Unable to create a guest chat session.",
  );
}
