import { NextResponse } from "next/server";
import { getPublicApi } from "@/lib/backend";

export async function GET() {
  try {
    const settings = await getPublicApi<Array<{ id: string; type: string; details: string }>>(
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
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
