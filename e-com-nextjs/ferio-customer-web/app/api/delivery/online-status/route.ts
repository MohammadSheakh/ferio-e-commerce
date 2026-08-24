import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";
import { riderTokenFromCookie } from "@/lib/rider-session";

export async function PATCH(request: Request) {
  try {
    const authHeader = await riderTokenFromCookie();
    if (!authHeader) {
      return bffErrorResponse(
        "Unauthorized.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const body = await request.json();

    const backendUrl =
      process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
    const res = await fetch(`${backendUrl}/delivery-personnel/online-status`, {
      method: "PATCH",
      headers: forwardedHeaders(request, {
        Authorization: authHeader,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    return proxyBackendResponse(res, "Unable to update online status.");
  } catch {
    return bffErrorResponse(
      "Unable to connect to backend server.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
