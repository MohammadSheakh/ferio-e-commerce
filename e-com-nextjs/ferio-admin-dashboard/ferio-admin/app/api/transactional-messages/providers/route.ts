import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceMessagingProviderConfig } from "@/lib/transactional-messages";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CommerceMessagingProviderConfig[]>(
        "/admin/transactional-messages/providers",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load messaging providers.");
  }
}
