import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReportsOverview } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const report = await adminApi<ReportsOverview>(
      `/admin/reports/overview${query}`,
    );
    return NextResponse.json({ data: report });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load reports.");
  }
}
