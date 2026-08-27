import { cartApi, cartErrorResponse, cartResponse } from "@/lib/cart-server";
import type { CartState } from "@/lib/cart";

export async function PATCH(
  request: Request,
  { params }: { params: { variantId: string } },
) {
  try {
    const body = await request.json();
    const cart = await cartApi<CartState>(
      `/cart/items/${params.variantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return cartResponse(cart);
  } catch (error) {
    return cartErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { variantId: string } },
) {
  try {
    const cart = await cartApi<CartState>(
      `/cart/items/${params.variantId}`,
      { method: "DELETE" },
    );
    return cartResponse(cart);
  } catch (error) {
    return cartErrorResponse(error);
  }
}
