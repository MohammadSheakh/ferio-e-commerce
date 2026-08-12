import { cartApi, cartErrorResponse, cartResponse } from "@/lib/cart-server";
import type { CartState } from "@/lib/cart";

export async function GET() {
  try {
    return cartResponse(await cartApi<CartState>("/cart"));
  } catch (error) {
    return cartErrorResponse(error);
  }
}
