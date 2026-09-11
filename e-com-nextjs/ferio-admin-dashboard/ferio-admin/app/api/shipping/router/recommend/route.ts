import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CourierRouteRecommendation } from "@/lib/shipping";

export async function POST(request: Request) {
  try {
    const recommendation = await adminApi<CourierRouteRecommendation>(
      "/admin/shipping/router/recommend",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await request.json()),
      },
    );
    return NextResponse.json({ data: recommendation });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to recommend a courier.");
  }
}
