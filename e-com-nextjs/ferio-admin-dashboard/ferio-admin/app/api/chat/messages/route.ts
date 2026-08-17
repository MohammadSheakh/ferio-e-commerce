import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: true, data: { results: [] } });
    }

    const backendUrl = process.env.NEST_BACKEND_URL || "http://127.0.0.1:5000";
    const targetUrl = `${backendUrl}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`;

    const res = await fetch(targetUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ success: true, data: { results: [] } });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ success: true, data: { results: [] } });
  }
}
