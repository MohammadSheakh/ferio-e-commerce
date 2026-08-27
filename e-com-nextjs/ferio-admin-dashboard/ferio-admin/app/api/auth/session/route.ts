import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { AdminSession } from "@/lib/admin-session";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<AdminSession>("/auth/session"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load the Admin session.");
  }
}
