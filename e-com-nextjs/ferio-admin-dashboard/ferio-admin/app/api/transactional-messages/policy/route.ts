import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceMessagingPolicy } from "@/lib/transactional-messages";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CommerceMessagingPolicy>(
        "/admin/transactional-messages/policy",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load messaging policy.");
  }
}

export async function PATCH(request: Request) {
  try {
    return NextResponse.json({
      data: await adminApi<CommerceMessagingPolicy>(
        "/admin/transactional-messages/policy",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(await request.json()),
        },
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update messaging policy.");
  }
}
