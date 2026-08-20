import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const data = await adminApi(`/delivery-personnel/admin/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update rider profile." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
