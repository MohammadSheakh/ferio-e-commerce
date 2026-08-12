import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { OrderConfirmation } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idempotencyKey?: string };
    const order = await cartApi<OrderConfirmation>("/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(body.idempotencyKey
          ? { "Idempotency-Key": body.idempotencyKey }
          : {}),
      },
      body: "{}",
    });
    const response = NextResponse.json({ data: order }, { status: 201 });
    response.cookies.set("ferio_cart", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    return cartErrorResponse(error);
  }
}
