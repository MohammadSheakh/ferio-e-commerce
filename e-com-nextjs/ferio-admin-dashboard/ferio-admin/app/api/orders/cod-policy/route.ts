import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CodPolicy } from "@/lib/orders";

export async function GET() {
  try {
    const policy = await adminApi<CodPolicy>("/admin/orders/cod-policy");
    return NextResponse.json({ data: policy });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to load COD policy.";
    return NextResponse.json({ message }, { status });
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
    const status = error instanceof AdminApiError ? error.status : 503;
    const message = error instanceof Error ? error.message : "Unable to update COD policy.";
    return NextResponse.json({ message }, { status });
  }
}
