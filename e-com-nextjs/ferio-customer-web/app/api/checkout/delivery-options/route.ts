import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";
import type { DeliveryOption } from "@/lib/checkout";

export async function GET() {
  try {
    const options = await cartApi<DeliveryOption[]>(
      "/checkout/delivery-options",
    );
    return NextResponse.json({ data: options });
  } catch (error) {
    return cartErrorResponse(error);
  }
}
