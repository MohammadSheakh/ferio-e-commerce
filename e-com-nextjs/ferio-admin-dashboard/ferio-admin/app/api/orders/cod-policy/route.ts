import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CodPolicy } from "@/lib/orders";

export async function GET() {
  try {
    const policy = await adminApi<CodPolicy>("/admin/orders/cod-policy");
    return NextResponse.json({ data: policy });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load COD policy.");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const policy = await adminApi<CodPolicy>("/admin/orders/cod-policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: policy });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update COD policy.");
  }
}
