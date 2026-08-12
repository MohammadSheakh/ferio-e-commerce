import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { EligibleCodCollection } from "@/lib/settlements";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<EligibleCodCollection[]>(
        "/admin/settlements/eligible-collections",
      ),
    });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load eligible COD collections.",
      },
      { status },
    );
  }
}
