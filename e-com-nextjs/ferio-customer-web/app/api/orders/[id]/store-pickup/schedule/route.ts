import { bffErrorResponse, proxyBackendResponse } from "@/lib/bff-response";
import { customerSessionFetch } from "@/lib/customer-session";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const result = await customerSessionFetch(
    `/orders/${params.id}/store-pickup/schedule`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );

  if (!result) {
    return bffErrorResponse(
      "Sign in to schedule store pickup.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }

  return proxyBackendResponse(
    result.response,
    "Unable to schedule store pickup.",
  );
}
