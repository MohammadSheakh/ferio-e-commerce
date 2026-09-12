import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import { getErrorMessage } from "@/lib/error-message";
import { proxyBackendResponse } from "@/lib/bff-response";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sessionRes = await customerSessionFetch(`/cart/saved/${params.id}`, {
      method: "DELETE",
    });
    if (!sessionRes) {
      return NextResponse.json(
        { message: "Unauthorized or failed to delete saved cart." },
        { status: 401 },
      );
    }
    return proxyBackendResponse(
      sessionRes.response,
      "Failed to delete saved cart.",
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to delete saved cart.") },
      { status: 500 },
    );
  }
}
