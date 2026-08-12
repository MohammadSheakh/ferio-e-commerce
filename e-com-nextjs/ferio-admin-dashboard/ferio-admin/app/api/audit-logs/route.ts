import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { AuditLogPage } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json({
      data: await adminApi<AuditLogPage>(`/admin/audit-logs${query}`),
    });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load audit history.",
      },
      { status },
    );
  }
}
