import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { PaymentRecoveryHealth } from "@/lib/payments";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi<PaymentRecoveryHealth>("/admin/payments/recovery/queue-health") });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to load payment recovery health.",
    );
  }
}
