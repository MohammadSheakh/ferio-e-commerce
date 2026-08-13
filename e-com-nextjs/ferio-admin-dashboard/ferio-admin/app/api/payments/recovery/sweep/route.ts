import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function POST() {
  try {
    return NextResponse.json({ data: await adminApi("/admin/payments/recovery/sweep", { method: "POST" }) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to queue payment recovery." }, { status: error instanceof AdminApiError ? error.status : 503 });
  }
}
