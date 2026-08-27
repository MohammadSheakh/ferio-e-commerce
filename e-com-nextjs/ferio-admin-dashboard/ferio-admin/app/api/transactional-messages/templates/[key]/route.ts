import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceMessageTemplate } from "@/lib/transactional-messages";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    return NextResponse.json({
      data: await adminApi<CommerceMessageTemplate>(
        `/admin/transactional-messages/templates/${encodeURIComponent(key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(await request.json()),
        },
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to save message template.");
  }
}
