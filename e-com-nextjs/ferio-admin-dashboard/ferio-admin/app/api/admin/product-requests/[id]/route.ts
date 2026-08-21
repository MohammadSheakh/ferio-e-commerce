import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";
import {
  bffErrorResponse,
  forwardedHeaders,
  proxyBackendResponse,
} from "@/lib/bff-response";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get("ferio_admin_access")?.value;
    if (!token) {
      return bffErrorResponse(
        "Admin session is required.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const res = await fetch(
      getBackendUrl(`/product-requests/${params.id}`),
      {
        method: "DELETE",
        headers: forwardedHeaders(request, {
          Authorization: `Bearer ${token}`,
        }),
        cache: "no-store",
      }
    );

    return proxyBackendResponse(res, "Failed to delete product request.");
  } catch {
    return bffErrorResponse(
      "Failed to delete product request.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
