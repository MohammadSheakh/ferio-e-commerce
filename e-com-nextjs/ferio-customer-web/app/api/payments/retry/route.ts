import { NextResponse } from "next/server";
import { cartApi, cartErrorResponse } from "@/lib/cart-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      data: await cartApi("/payments/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch (error) {
    return cartErrorResponse(error);
  }
}
