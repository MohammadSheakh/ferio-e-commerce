import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/customer-session";
import { withCorrelationId } from "@/lib/correlation";
import { hostForwardHeadersFromRequest } from "@/lib/host-forward";
import { getErrorMessage } from "@/lib/error-message";

export async function GET(
  request: Request,
  { params }: { params: { token: string } },
) {
  try {
    const res = await fetch(
      `${backendApiUrl}/cart/saved/share/${params.token}`,
      {
        headers: withCorrelationId({
          ...hostForwardHeadersFromRequest(request),
          Accept: "application/json",
        }),
        cache: "no-store",
      },
    );
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to fetch shared cart.") },
      { status: 500 },
    );
  }
}
