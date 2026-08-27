import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { AuditLogPage } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json({
      data: await adminApi<AuditLogPage>(`/admin/audit-logs${query}`),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load audit history.");
  }
}
