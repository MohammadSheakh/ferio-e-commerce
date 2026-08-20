import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await adminApi("/delivery-personnel/admin/assign-order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to assign order." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
