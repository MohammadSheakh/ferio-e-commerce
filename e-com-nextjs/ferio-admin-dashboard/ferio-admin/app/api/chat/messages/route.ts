import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: true, data: { results: [] } });
    }

    const data = await adminApi<unknown>(
      `/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load chat messages.");
  }
}
