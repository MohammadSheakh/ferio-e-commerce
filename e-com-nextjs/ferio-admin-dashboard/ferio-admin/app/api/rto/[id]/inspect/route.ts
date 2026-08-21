import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { RtoCase } from "@/lib/shipping";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await adminApi<RtoCase>(`/admin/rto/${params.id}/inspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to inspect RTO parcel.");
  }
}
