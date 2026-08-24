import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import { cookies } from "next/headers";
import { withCorrelationId } from "@/lib/correlation";
import {
  backendErrorResponse,
  bffErrorResponse,
  type BackendErrorPayload,
} from "@/lib/bff-response";

export async function POST(
  req: Request,
  { params }: { params: { orderId: string } },
) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    // Reorder is account-scoped on the backend; a customer session is required.
    const cartToken = cookies().get("ferio_cart")?.value;
    const result = await customerSessionFetch(`/cart/reorder/${params.orderId}`, {
      method: "POST",
      headers: withCorrelationId({
        "Content-Type": "application/json",
        ...(cartToken ? { "X-Cart-Token": cartToken } : {}),
      }),
      body: JSON.stringify(body),
    });

    if (!result) {
      return bffErrorResponse(
        "Sign in to reorder items from your orders.",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const payload = (await result.response.json()) as BackendErrorPayload & {
      data?: Record<string, unknown>;
      cartToken?: string;
    };
    if (!result.response.ok) {
      return backendErrorResponse(
        payload,
        result.response.status,
        "Unable to reorder items.",
      );
    }
    const data = payload.data ?? payload;
    const response = NextResponse.json(data, { status: result.response.status });

    if (data.cartToken) {
      response.cookies.set("ferio_cart", String(data.cartToken), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to reorder items.",
      },
      { status: 500 },
    );
  }
}
