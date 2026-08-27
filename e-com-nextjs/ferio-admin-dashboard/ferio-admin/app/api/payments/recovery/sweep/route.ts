import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function POST() {
  try {
    return NextResponse.json({ data: await adminApi("/admin/payments/recovery/sweep", { method: "POST" }) });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to queue payment recovery.");
  }
}
