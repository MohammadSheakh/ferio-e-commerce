import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";
import { riderTokenFromCookie } from "@/lib/rider-session";

export async function GET(request: Request) {
  try {
    const authHeader = await riderTokenFromCookie();
    if (!authHeader) {
      return bffErrorResponse(
        "Unauthorized.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
    const res = await fetch(`${backendUrl}/delivery-personnel/my-orders`, {
      headers: forwardedHeaders(request, {
        Authorization: authHeader,
        Accept: "application/json",
      }),
      cache: "no-store",
    });

    return proxyBackendResponse(res, "Unable to load delivery orders.");
  } catch {
    return bffErrorResponse(
      "Unable to connect to backend server.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
