import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/customer-session";
import { cookies } from "next/headers";
import { withCorrelationId } from "@/lib/correlation";
import { hostForwardHeadersFromRequest } from "@/lib/host-forward";

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  try {
    const cartToken = cookies().get("ferio_cart")?.value;
    const res = await fetch(
      `${backendApiUrl}/cart/saved/share/${params.token}/import`,
      {
        method: "POST",
        headers: withCorrelationId({
          ...hostForwardHeadersFromRequest(request),
          "Content-Type": "application/json",
          ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
        }),
        cache: "no-store",
      },
    );

    const payload = await res.json();
    const data = payload.data || payload;
    const response = NextResponse.json(data, { status: res.status });

    if (data.cartToken) {
      response.cookies.set("ferio_cart", data.cartToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to import shared cart." },
      { status: 500 },
    );
  }
}
