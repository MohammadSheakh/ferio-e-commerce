import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import { getErrorMessage } from "@/lib/error-message";
import { proxyBackendResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const sessionRes = await customerSessionFetch("/cart/saved");
    if (!sessionRes) {
      return NextResponse.json(
        { message: "Unauthorized or session expired." },
        { status: 401 },
      );
    }
    return proxyBackendResponse(
      sessionRes.response,
      "Failed to fetch saved carts.",
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to fetch saved carts.") },
      { status: 500 },
    );
  }
}
