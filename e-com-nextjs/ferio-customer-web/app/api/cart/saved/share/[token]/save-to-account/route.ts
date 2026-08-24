import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const sessionRes = await customerSessionFetch(
      `/cart/saved/share/${params.token}/save-to-account`,
      { method: "POST" },
    );
    if (!sessionRes || !sessionRes.response.ok) {
      return NextResponse.json(
        { message: "Unauthorized or session expired." },
        { status: 401 },
      );
    }
    const payload = await sessionRes.response.json();
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to copy shared cart to account." },
      { status: 500 },
    );
  }
}
