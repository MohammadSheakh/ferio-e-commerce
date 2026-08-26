import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/customer-session";
import { forwardedHeaders } from "@/lib/bff-response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendApiUrl}/storefront-analytics/events`, {
      method: "POST",
      headers: forwardedHeaders(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (response.ok) {
      return NextResponse.json({ success: true }, { status: 202 });
    }
    return NextResponse.json({ success: false }, { status: response.status });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
