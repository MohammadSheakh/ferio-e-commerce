import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceMessageTemplate } from "@/lib/transactional-messages";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi<CommerceMessageTemplate[]>(
        "/admin/transactional-messages/templates",
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load message templates.");
  }
}
