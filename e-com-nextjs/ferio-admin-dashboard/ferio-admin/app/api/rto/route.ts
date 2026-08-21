import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { RtoCase } from "@/lib/shipping";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi<RtoCase[]>("/admin/rto") });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load RTO cases.");
  }
}
