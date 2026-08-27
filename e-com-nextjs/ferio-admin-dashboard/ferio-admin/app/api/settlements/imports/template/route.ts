import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { SettlementReportTemplate } from "@/lib/settlements";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<SettlementReportTemplate>(
        "/admin/settlements/imports/template",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to download settlement template.",
    );
  }
}
