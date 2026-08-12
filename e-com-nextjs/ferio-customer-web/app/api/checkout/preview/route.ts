import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { CheckoutPreview } from "@/lib/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preview = await cartApi<CheckoutPreview>("/checkout/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: preview });
  } catch (error) {
    return cartErrorResponse(error);
  }
}
