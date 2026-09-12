import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import { getErrorMessage } from "@/lib/error-message";
import { proxyBackendResponse } from "@/lib/bff-response";

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const sessionRes = await customerSessionFetch(
      `/cart/saved/share/${params.token}/save-to-account`,
      { method: "POST" },
    );
    if (!sessionRes) {
      return NextResponse.json(
        { message: "Unauthorized or session expired." },
        { status: 401 },
      );
    }
    return proxyBackendResponse(
      sessionRes.response,
      "Failed to copy shared cart to account.",
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: getErrorMessage(
          error,
          "Failed to copy shared cart to account.",
        ),
      },
      { status: 500 },
    );
  }
}
