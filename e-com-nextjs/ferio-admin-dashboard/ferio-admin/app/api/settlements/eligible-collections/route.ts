import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { EligibleCodCollection } from "@/lib/settlements";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<EligibleCodCollection[]>(
        "/admin/settlements/eligible-collections",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to load eligible COD collections.",
    );
  }
}
