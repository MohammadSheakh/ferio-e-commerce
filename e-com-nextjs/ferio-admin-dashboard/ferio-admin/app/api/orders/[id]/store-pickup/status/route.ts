import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const result = await adminApi(`/admin/orders/${params.id}/store-pickup/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to update store pickup status.";
    return NextResponse.json({ message }, { status });
  }
}
