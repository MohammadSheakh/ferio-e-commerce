import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secret = process.env.STOREFRONT_REVALIDATE_SECRET || "ferio-internal-revalidate-secret";

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const slug = body.slug || "home";

    // Invalidate App Router cache tags
    revalidateTag(`storefront-page-${slug}`);
    revalidatePath("/");

    return NextResponse.json({
      revalidated: true,
      slug,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Revalidation failed" },
      { status: 500 },
    );
  }
}

