import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

    const rawBackend = process.env.FERIO_API_URL || process.env.NEXT_PUBLIC_FERIO_API_URL || process.env.NEST_BACKEND_URL || "http://localhost:6733";
    const backendUrl = rawBackend.replace(/\/api\/v1\/?$/, "");
    const targetUrl = `${backendUrl}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`;
    const token = cookies().get("ferio_admin_access")?.value;
    if (!token) {
      return bffErrorResponse(
        "Admin session is required.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const res = await fetch(targetUrl, {
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
