import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { AdminWalletTopUpPage } from "@/lib/wallet";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json({
      data: await adminApi<AdminWalletTopUpPage>(`/admin/wallet/top-ups${query}`),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load wallet top-ups.");
  }
}
