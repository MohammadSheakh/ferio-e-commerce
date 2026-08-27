import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const settings = await adminApi<Array<{ id: string; type: string; details: string }>>(
      "/settings?type=heroShowcase"
    );
    const first = Array.isArray(settings) ? settings[0] : null;
    let slides = [];
    if (first && first.details) {
      try {
        slides = JSON.parse(first.details);
      } catch (e) {
        slides = [];
      }
    }
    return NextResponse.json({ data: slides });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to load hero showcase settings.",
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slidesData = body.slides || [];
    const settings = await adminApi<{ id: string; type: string; details: string }>(
      "/settings?type=heroShowcase",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "heroShowcase",
          details: JSON.stringify(slidesData),
        }),
      }
    );
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return adminApiErrorResponse(
      error,
      "Unable to save hero showcase settings.",
    );
  }
}
