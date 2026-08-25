import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";

/** Proxies the tenant-plane plan/usage status for the signed-in admin. */
export async function GET() {
  try {
    const data = await adminApi<Record<string, unknown>>("/tenancy/my-plan");
    return NextResponse.json({ data });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 502;
    return NextResponse.json(
      { message: (error as Error).message || "Plan status unavailable." },
      { status },
    );
  }
}
