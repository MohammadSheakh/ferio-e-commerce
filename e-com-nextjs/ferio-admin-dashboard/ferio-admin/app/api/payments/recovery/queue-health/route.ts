import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { PaymentRecoveryHealth } from "@/lib/payments";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi<PaymentRecoveryHealth>("/admin/payments/recovery/queue-health") });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to load payment recovery health." }, { status: error instanceof AdminApiError ? error.status : 503 });
  }
}
