import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { CheckoutOrderResult, OrderConfirmation } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idempotencyKey?: string; paymentMethod?: "COD" | "PREPAID"; paymentProvider?: "SSLCOMMERZ" | "AAMARPAY" };
    const order = await cartApi<OrderConfirmation>("/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(body.idempotencyKey
          ? { "Idempotency-Key": body.idempotencyKey }
          : {}),
      },
      body: JSON.stringify({ paymentMethod: body.paymentMethod || "COD" }),
    });
    let result: CheckoutOrderResult = order;
    if (body.paymentMethod === "PREPAID" && body.paymentProvider) {
      const payment = await cartApi<NonNullable<CheckoutOrderResult["payment"]>>("/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, provider: body.paymentProvider }),
      });
      result = { ...order, payment };
    }
    const response = NextResponse.json({ data: result }, { status: 201 });
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
