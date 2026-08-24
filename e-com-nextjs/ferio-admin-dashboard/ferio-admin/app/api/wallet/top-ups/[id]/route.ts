import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { AdminWalletTopUp } from "@/lib/wallet";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi<AdminWalletTopUp>(
        `/admin/wallet/top-ups/${params.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: await request.text(),
        },
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to review the wallet top-up.");
  }
}
