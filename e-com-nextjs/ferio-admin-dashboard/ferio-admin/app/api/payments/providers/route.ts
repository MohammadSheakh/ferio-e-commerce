import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi("/admin/payments/providers") });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to load payment providers." }, { status: error instanceof AdminApiError ? error.status : 503 });
  }
}
