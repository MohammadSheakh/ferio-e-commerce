import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
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

    return proxyBackendResponse(response, "Application failed.");
  } catch {
    return bffErrorResponse(
      "The application service is unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
