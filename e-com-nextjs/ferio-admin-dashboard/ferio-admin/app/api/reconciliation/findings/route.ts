import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReconciliationFindingPage } from "@/lib/settlements";

export async function GET(request: Request) {
  try {
    const result = await adminApi<ReconciliationFindingPage>(
      `/admin/reconciliation/findings${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to load reconciliation findings.",
    );
  }
}
