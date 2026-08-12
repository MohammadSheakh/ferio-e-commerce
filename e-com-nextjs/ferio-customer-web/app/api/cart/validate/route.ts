import { cartApi, cartErrorResponse, cartResponse } from "@/lib/cart-server";
import type { CartState } from "@/lib/cart";

export async function POST() {
  try {
    const cart = await cartApi<CartState>("/cart/validate", {
      method: "POST",
    });
    return cartResponse(cart);
  } catch (error) {
    return cartErrorResponse(error);
  }
}
