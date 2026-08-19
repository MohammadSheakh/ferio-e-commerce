import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const updated = await adminApi(`/admin/store-locations/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(updated);
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to update store location.";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await adminApi(`/admin/store-locations/${params.id}`, {
      method: "DELETE",
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to delete store location.";
    return NextResponse.json({ message }, { status });
  }
}
