import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ReturnEligibility } from "@/lib/returns";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ data: await adminApi<ReturnEligibility>(`/admin/orders/${params.id}/returns/eligibility`) });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to evaluate return.");
  }
}
