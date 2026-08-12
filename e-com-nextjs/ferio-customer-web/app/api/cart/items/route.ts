import { cartApi, cartErrorResponse, cartResponse } from "@/lib/cart-server";
import type { CartState } from "@/lib/cart";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cart = await cartApi<CartState & { cartToken?: string }>(
      "/cart/items",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return cartResponse(cart, 201);
  } catch (error) {
    return cartErrorResponse(error);
  }
}
