import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";
import { backendApiUrl, customerSessionFetch } from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionResponse = await customerSessionFetch("/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Product requests are intentionally public. Only the authenticated path
    // needs session rotation; guests still submit through the same tenant-aware
    // BFF with the original forwarded host context.
    const res =
      sessionResponse?.response ??
      (await fetch(`${backendApiUrl}/product-requests`, {
        method: "POST",
        headers: forwardedHeaders(request, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
        cache: "no-store",
      }));

    return proxyBackendResponse(res, "Failed to submit product request.");
  } catch {
    return bffErrorResponse(
      "Failed to submit product request.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
