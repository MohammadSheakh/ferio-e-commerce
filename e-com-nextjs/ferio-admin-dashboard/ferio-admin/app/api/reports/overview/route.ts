import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReportsOverview } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const report = await adminApi<ReportsOverview>(
      `/admin/reports/overview${query}`,
    );
    return NextResponse.json({ data: report });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load reports.";
    return NextResponse.json({ message }, { status });
  }
}
