import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { StaffAccessOverview } from "@/lib/staff-access";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<StaffAccessOverview>("/admin/staff"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load staff access.");
  }
}
