import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function POST() {
  try {
    const data = await adminApi<{ token: string; expiresInSeconds: number }>(
      "/socket-auth/ticket",
      { method: "POST" },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to authorize real-time chat.",
    );
  }
}
