import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReturnCase } from "@/lib/returns";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<ReturnCase>(`/admin/returns/${params.id}/inspect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await request.json()) });
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to inspect return.");
  }
}
