import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const result = await adminApi(`/admin/orders/${params.id}/store-pickup/verify-handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to verify store handover OTP.";
    return NextResponse.json({ message }, { status });
  }
}
