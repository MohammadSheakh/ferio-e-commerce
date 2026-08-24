import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/customer-session";
import { cookies } from "next/headers";
import { withCorrelationId } from "@/lib/correlation";

export async function POST(
  req: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const cartToken = cookies().get("ferio_cart")?.value;
    const res = await fetch(
      `${backendApiUrl}/cart/reorder/${params.orderId}`,
      {
        method: "POST",
        headers: withCorrelationId({
          "Content-Type": "application/json",
          ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
        }),
        body: JSON.stringify(body),
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
      { message: error.message || "Failed to reorder items." },
      { status: 500 },
    );
  }
}
