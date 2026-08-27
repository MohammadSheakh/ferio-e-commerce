import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { SettlementReportPreflight } from "@/lib/settlements";

export async function POST(request: Request) {
  try {
    const result = await adminApi<SettlementReportPreflight>(
      "/admin/settlements/imports/preflight",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await request.json()),
      },
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to validate settlement CSV.");
  }
}
