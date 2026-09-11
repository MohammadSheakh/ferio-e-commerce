import { NextResponse } from "next/server";
import { customerSessionFetch, backendApiUrl } from "@/lib/customer-session";
import { cookies } from "next/headers";
import { withCorrelationId } from "@/lib/correlation";
import { hostForwardHeadersFromRequest } from "@/lib/host-forward";
import { getErrorMessage } from "@/lib/error-message";
import { proxyBackendResponse } from "@/lib/bff-response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cartToken = cookies().get("ferio_cart")?.value;

    const sessionRes = await customerSessionFetch("/cart/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
      },
      body: JSON.stringify(body),
    });

    if (sessionRes) {
      return proxyBackendResponse(
        sessionRes.response,
        "Failed to save cart.",
      );
    }

    // Guest fallback
    const res = await fetch(`${backendApiUrl}/cart/save`, {
      method: "POST",
      headers: withCorrelationId({
        ...hostForwardHeadersFromRequest(req),
        "Content-Type": "application/json",
        ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
      }),
      body: JSON.stringify(body),
    });

    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to save cart.") },
      { status: 500 },
    );
  }
}
