import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const token =
      cookieStore.get("ferio_customer_access")?.value ||
      cookieStore.get("ferio_token")?.value;

    const rawBackend =
      process.env.FERIO_API_URL ||
      process.env.NEXT_PUBLIC_FERIO_API_URL ||
      process.env.NEST_BACKEND_URL ||
      "http://localhost:6733";
    const backendUrl = rawBackend.replace(/\/api\/v1\/?$/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${backendUrl}/api/v1/product-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to submit product request" },
      { status: 500 }
    );
  }
}
