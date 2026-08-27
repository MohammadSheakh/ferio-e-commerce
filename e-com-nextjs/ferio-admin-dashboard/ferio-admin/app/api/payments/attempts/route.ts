import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { PaymentAttemptPage } from "@/lib/payments";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json({
      data: await adminApi<PaymentAttemptPage>(
        `/admin/payments/attempts${query}`,
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load payment attempts.");
  }
}
