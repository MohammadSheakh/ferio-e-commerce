import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReturnCase } from "@/lib/returns";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<ReturnCase>(`/admin/returns/${params.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await request.json()) });
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to review return." }, { status });
  }
}
