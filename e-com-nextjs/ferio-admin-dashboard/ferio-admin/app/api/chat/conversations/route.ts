import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const data = await adminApi<unknown>("/conversations/all?limit=100");
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load conversations.");
  }
}
