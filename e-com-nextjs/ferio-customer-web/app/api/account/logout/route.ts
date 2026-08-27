import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  backendApiUrl,
  clearCustomerSession,
} from "@/lib/customer-session";
import { forwardedHeaders } from "@/lib/bff-response";

export async function POST(request: Request) {
  const refreshToken = cookies().get("ferio_customer_refresh")?.value;
  if (refreshToken) {
    try {
      await fetch(`${backendApiUrl}/auth/logout`, {
        method: "POST",
        headers: forwardedHeaders(request, {
          Cookie: `refreshToken=${refreshToken}`,
        }),
        cache: "no-store",
      });
    } catch {}
  }
  clearCustomerSession();
  return NextResponse.json({ success: true });
}
