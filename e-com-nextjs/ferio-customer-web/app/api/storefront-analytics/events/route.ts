import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/storefront-analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return NextResponse.json({ success: true }, { status: 202 });
    }
    return NextResponse.json({ success: false }, { status: response.status });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
