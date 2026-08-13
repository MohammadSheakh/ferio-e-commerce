import { NextResponse } from "next/server";
import { backendMessage } from "@/lib/customer-auth-proxy";
import { backendApiUrl } from "@/lib/customer-session";

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email;
  } catch {
    return NextResponse.json({ message: "Enter a valid email." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${backendApiUrl}/auth/resend-verification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      },
    );
    const payload = await upstream.json();
    return NextResponse.json(
      { message: backendMessage(payload, "Unable to resend the code.") },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json(
      { message: "The Ferio API is unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
