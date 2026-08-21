import { getBackendUrl } from "@/lib/backend";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    purpose?: string;
    token?: string;
    password?: string;
  };
  if (
    !["invite", "reset"].includes(body.purpose ?? "") ||
    !body.token ||
    !body.password
  ) {
    return bffErrorResponse(
      "A valid staff access link and password are required.",
      400,
      "VALIDATION_ERROR",
    );
  }
  const endpoint =
    body.purpose === "invite" ? "accept-invitation" : "complete-reset";

  const response = await fetch(getBackendUrl(`/staff-access/${endpoint}`), {
    method: "POST",
    headers: forwardedHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify({ token: body.token, password: body.password }),
    cache: "no-store",
  });
  return proxyBackendResponse(response, "Unable to complete staff access.");
}
