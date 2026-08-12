import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReturnCase } from "@/lib/returns";

function failure(error: unknown, fallback: string) {
  const status = error instanceof AdminApiError ? error.status : 503;
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ data: await adminApi<ReturnCase[]>(`/admin/orders/${params.id}/returns`) });
  } catch (error) { return failure(error, "Unable to load returns."); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<ReturnCase>(`/admin/orders/${params.id}/returns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await request.json()) });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) { return failure(error, "Unable to create return."); }
}
