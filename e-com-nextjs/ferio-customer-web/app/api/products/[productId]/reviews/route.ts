import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function POST(
  request: Request,
  { params }: { params: { productId: string } },
) {
  const result = await customerSessionFetch(
    `/product-content/${params.productId}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
    },
  );
  if (!result) return NextResponse.json({ message: "Sign in to submit a review." }, { status: 401 });
  const payload = await result.response.json();
  return NextResponse.json(
    result.response.ok ? { data: payload.data } : { message: Array.isArray(payload.message) ? payload.message.join(" ") : payload.message },
    { status: result.response.status },
  );
}
