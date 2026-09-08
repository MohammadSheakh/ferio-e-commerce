import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";
import { getErrorMessage } from "@/lib/error-message";

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
  } catch (error: unknown) {
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to delete saved cart.") },
      { status: 500 },
    );
  }
}
