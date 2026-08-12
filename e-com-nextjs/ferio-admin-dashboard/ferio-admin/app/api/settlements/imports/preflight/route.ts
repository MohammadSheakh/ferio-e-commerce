import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
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
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate settlement CSV.",
      },
      { status },
    );
  }
}
