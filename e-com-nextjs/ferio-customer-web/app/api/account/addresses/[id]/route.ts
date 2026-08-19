import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const result = await customerSessionFetch(`/account/commerce/addresses/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!result) return NextResponse.json({ message: "Sign in to update address." }, { status: 401 });
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const result = await customerSessionFetch(`/account/commerce/addresses/${params.id}`, {
    method: "DELETE",
  });

  if (!result) return NextResponse.json({ message: "Sign in to delete address." }, { status: 401 });
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
