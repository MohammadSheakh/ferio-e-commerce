import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { PaymentAttempt } from "@/lib/payments";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi<PaymentAttempt[]>("/admin/payments/attempts") });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to load payment attempts." }, { status: error instanceof AdminApiError ? error.status : 503 });
  }
}
