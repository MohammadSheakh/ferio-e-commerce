import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReconciliationFindingPage } from "@/lib/settlements";

export async function GET(request: Request) {
  try {
    const result = await adminApi<ReconciliationFindingPage>(
      `/admin/reconciliation/findings${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load reconciliation findings.",
      },
      { status },
    );
  }
}
