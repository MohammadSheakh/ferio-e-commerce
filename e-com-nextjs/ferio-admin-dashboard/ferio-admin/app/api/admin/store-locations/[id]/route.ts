import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

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
    return adminApiErrorResponse(error, "Unable to update store location.");
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
    return adminApiErrorResponse(error, "Unable to delete store location.");
  }
}
