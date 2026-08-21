import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReturnCasePage } from "@/lib/returns";

export async function GET(request: Request) {
  try {
    const cases = await adminApi<ReturnCasePage>(`/admin/returns${new URL(request.url).search}`);
    return NextResponse.json({ data: cases });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load returns.");
  }
}
