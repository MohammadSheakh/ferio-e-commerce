import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
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
    return adminApiErrorResponse(error, "Unable to load message outbox.");
  }
}
