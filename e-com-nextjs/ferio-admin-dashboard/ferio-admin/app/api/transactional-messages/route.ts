import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CommerceMessagePage } from "@/lib/transactional-messages";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return NextResponse.json({
      data: await adminApi<CommerceMessagePage>(
        `/admin/transactional-messages${query}`,
      ),
    });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load message outbox.",
      },
      { status },
    );
  }
}
