import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ApiEnvelope } from "@/lib/backend";
import type { CartState } from "@/lib/cart";
import { withCorrelationId } from "@/lib/correlation";
import { hostForwardHeaders } from "@/lib/host-forward";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export class CartApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "INTERNAL_ERROR",
    readonly correlationId?: string,
  ) {
    super(message);
  }
}

export async function cartApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = cookies().get("ferio_cart")?.value;
  const response = await fetch(
    `${backendApiUrl}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: withCorrelationId({
        Accept: "application/json",
        ...(await hostForwardHeaders()),
        ...(token ? { "X-Cart-Token": token } : {}),
        ...init?.headers,
      }),
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.data === undefined) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message;
    throw new CartApiError(
      message || "Unable to update the cart.",
      response.status,
      payload.code,
      payload.correlationId,
    );
  }
  return payload.data;
}

export function cartResponse(
  cart: CartState & { cartToken?: string },
  status = 200,
) {
  const { cartToken, ...safeCart } = cart;
  const response = NextResponse.json({ data: safeCart }, { status });
  if (cartToken) {
    response.cookies.set("ferio_cart", cartToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }
  return response;
}

export function cartErrorResponse(error: unknown) {
  const status = error instanceof CartApiError ? error.status : 503;
  const message =
    error instanceof Error ? error.message : "The cart service is unavailable.";
  const response = NextResponse.json(
    {
      message,
      code:
        error instanceof CartApiError ? error.code : "SERVICE_UNAVAILABLE",
      correlationId:
        error instanceof CartApiError ? error.correlationId : undefined,
    },
    { status },
  );
  if (
    status === 404 ||
    status === 409 ||
    message.toLowerCase().includes("active cart not found") ||
    message.toLowerCase().includes("no longer active")
  ) {
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
