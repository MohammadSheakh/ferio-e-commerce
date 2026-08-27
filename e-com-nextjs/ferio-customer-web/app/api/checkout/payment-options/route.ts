import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { PaymentOptions } from "@/lib/checkout";

export async function GET() {
  try {
    return NextResponse.json({ data: await cartApi<PaymentOptions>("/checkout/payment-options") });
  } catch (error) {
    return cartErrorResponse(error);
  }
}
