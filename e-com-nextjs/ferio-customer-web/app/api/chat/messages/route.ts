import { NextResponse } from "next/server";
import {
  backendApiUrl,
  customerSessionFetch,
} from "@/lib/customer-session";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: true, data: { results: [] } });
    }

    const targetPath = `/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`;
    const authenticated = await customerSessionFetch(targetPath);
    if (authenticated?.response.ok) {
      const json = await authenticated.response.json();
      return NextResponse.json(json);
    }

    const guestId = request.headers.get("x-chat-guest-id");
    if (!guestId) {
      return bffErrorResponse(
        "A guest chat session is required.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const ticketResponse = await fetch(`${backendApiUrl}/socket-auth/guest-ticket`, {
      method: "POST",
      headers: forwardedHeaders(request, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ guestId }),
      cache: "no-store",
    });
    if (!ticketResponse.ok) {
      return proxyBackendResponse(
        ticketResponse,
        "Unable to create a guest chat session.",
      );
    }
    const ticketPayload = (await ticketResponse.json()) as { data?: { token?: string } };
    const token = ticketPayload.data?.token;
    if (!token) {
      return bffErrorResponse(
        "Unable to create a guest chat session.",
        502,
        "UPSTREAM_ERROR",
      );
    }

    const res = await fetch(`${backendApiUrl}${targetPath}`, {
      headers: forwardedHeaders(request, {
        Authorization: `Bearer ${token}`,
      }),
      cache: "no-store",
    });
    return proxyBackendResponse(res, "Unable to load chat messages.");
  } catch {
    return bffErrorResponse(
      "Unable to load chat messages.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
