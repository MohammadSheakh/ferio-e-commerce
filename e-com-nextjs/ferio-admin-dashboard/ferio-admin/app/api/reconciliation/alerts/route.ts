import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { OperationalAlertResponse } from "@/lib/operational-alerts";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<OperationalAlertResponse>(
        "/admin/reconciliation/alerts",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load operational alerts.");
  }
}
