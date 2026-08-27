import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { CheckoutOrderResult, OrderConfirmation } from "@/lib/checkout";
import { cookies } from "next/headers";
import { bffErrorResponse, proxyBackendResponse } from "@/lib/bff-response";
import { customerSessionFetch } from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idempotencyKey?: string; paymentMethod?: "COD" | "PREPAID" | "PAY_AT_STORE" | "WALLET"; paymentProvider?: "SSLCOMMERZ" | "AAMARPAY"; phone?: string };
    if (body.paymentMethod === "WALLET") {
      const cartToken = cookies().get("ferio_cart")?.value;
      const result = await customerSessionFetch("/checkout/orders/wallet", {
        method: "POST",
        headers: {
          ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
          ...(body.idempotencyKey
            ? { "Idempotency-Key": body.idempotencyKey }
            : {}),
        },
      });
      if (!result) {
        return bffErrorResponse(
          "Sign in to pay with your wallet.",
          401,
          "AUTHENTICATION_REQUIRED",
        );
      }
      const response = await proxyBackendResponse(
        result.response,
        "Unable to place the wallet order.",
      );
      if (result.response.ok) {
        response.cookies.set("ferio_cart", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 0,
          path: "/",
        });
      }
      return response;
    }
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
        // Reference + placement phone prove the caller placed this order.
        body: JSON.stringify({
          orderId: order.id,
          provider: body.paymentProvider,
          reference: order.reference,
          phone: body.phone,
        }),
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
