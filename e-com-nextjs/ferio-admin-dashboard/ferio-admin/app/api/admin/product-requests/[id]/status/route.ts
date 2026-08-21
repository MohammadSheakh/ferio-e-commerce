import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const token = cookies().get("ferio_admin_access")?.value;
    if (!token) {
      return bffErrorResponse(
        "Admin session is required.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const res = await fetch(
      getBackendUrl(`/product-requests/${params.id}/status`),
      {
        method: "PATCH",
        headers: forwardedHeaders(request, {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    return proxyBackendResponse(
      res,
      "Failed to update product request status.",
    );
  } catch {
    return bffErrorResponse(
      "Failed to update product request status.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
