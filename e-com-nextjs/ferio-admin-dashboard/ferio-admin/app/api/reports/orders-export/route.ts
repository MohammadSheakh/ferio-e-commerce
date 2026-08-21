import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReportOrdersExport } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const result = await adminApi<ReportOrdersExport>(
      `/admin/reports/orders-export${query}`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to export orders.");
  }
}
