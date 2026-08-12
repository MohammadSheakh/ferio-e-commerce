import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { ReturnEligibility } from "@/lib/returns";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ data: await adminApi<ReturnEligibility>(`/admin/orders/${params.id}/returns/eligibility`) });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to evaluate return." }, { status });
  }
}
