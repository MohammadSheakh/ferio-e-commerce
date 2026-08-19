import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await customerSessionFetch("/account/commerce/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!result) return NextResponse.json({ message: "Sign in to add an address." }, { status: 401 });
  const payload = await result.response.json();
  if (!result.response.ok) {
    return NextResponse.json(
      { message: Array.isArray(payload.message) ? payload.message.join(" ") : payload.message },
      { status: result.response.status },
    );
  }
  const payloadData = payload.data ?? payload;
  return NextResponse.json({ data: payloadData });
}
