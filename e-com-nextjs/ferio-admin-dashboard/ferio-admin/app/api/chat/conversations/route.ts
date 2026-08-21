import { cookies } from "next/headers";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const rawBackend = process.env.FERIO_API_URL || process.env.NEXT_PUBLIC_FERIO_API_URL || process.env.NEST_BACKEND_URL || "http://localhost:6733";
    const backendUrl = rawBackend.replace(/\/api\/v1\/?$/, "");
    const targetUrl = `${backendUrl}/api/v1/conversations/all?limit=100`;
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
    return proxyBackendResponse(res, "Unable to load conversations.");
  } catch {
    return bffErrorResponse(
      "Unable to load conversations.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
