import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

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
    return adminApiErrorResponse(error, "Unable to assign order.");
  }
}
