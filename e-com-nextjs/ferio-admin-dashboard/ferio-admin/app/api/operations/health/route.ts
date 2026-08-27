import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { OperationsHealth } from "@/lib/operations-health";

export async function GET() {
  try {
    const result = await adminApi<OperationsHealth>("/admin/operations/health");
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load system health.");
  }
}
