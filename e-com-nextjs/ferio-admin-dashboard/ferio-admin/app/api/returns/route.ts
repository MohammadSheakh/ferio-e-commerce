import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReturnCasePage } from "@/lib/returns";

export async function GET(request: Request) {
  try {
    const cases = await adminApi<ReturnCasePage>(`/admin/returns${new URL(request.url).search}`);
    return NextResponse.json({ data: cases });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to load returns." }, { status });
  }
}
