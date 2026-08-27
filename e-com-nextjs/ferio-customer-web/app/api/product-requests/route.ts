import { cookies } from "next/headers";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const token =
      cookieStore.get("ferio_customer_access")?.value ||
      cookieStore.get("ferio_token")?.value;

    const rawBackend =
      process.env.FERIO_API_URL ||
      process.env.NEXT_PUBLIC_FERIO_API_URL ||
      process.env.NEST_BACKEND_URL ||
      "http://localhost:6733";
    const backendUrl = rawBackend.replace(/\/api\/v1\/?$/, "");

    const headers = forwardedHeaders(request, {
      "Content-Type": "application/json",
    });
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${backendUrl}/api/v1/product-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    return proxyBackendResponse(res, "Failed to submit product request.");
  } catch {
    return bffErrorResponse(
      "Failed to submit product request.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
