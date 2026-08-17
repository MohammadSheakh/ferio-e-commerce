import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function PUT(request: Request) {
  const body = JSON.stringify(await request.json());
  const result = await customerSessionFetch("/account/commerce/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!result) {
    return NextResponse.json({ message: "Sign in to update your account." }, { status: 401 });
  }

  const payload = await result.response.json();
  if (!result.response.ok) {
    return NextResponse.json(
      { message: Array.isArray(payload.message) ? payload.message.join(" ") : payload.message },
      { status: result.response.status },
    );
  }

  const payloadData = payload.data ?? payload;
  return NextResponse.json({
    data: payloadData,
    account: payloadData.account ?? payload.account,
    linked: payloadData.linked ?? payload.linked,
    customer: payloadData.customer ?? payload.customer,
  });
}
