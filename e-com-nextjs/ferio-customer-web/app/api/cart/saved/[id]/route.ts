import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const sessionRes = await customerSessionFetch(`/cart/saved/${params.id}`, {
      method: "DELETE",
    });
    if (!sessionRes || !sessionRes.response.ok) {
      return NextResponse.json(
        { message: "Unauthorized or failed to delete saved cart." },
        { status: 401 },
      );
    }
    const payload = await sessionRes.response.json();
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to delete saved cart." },
      { status: 500 },
    );
  }
}
