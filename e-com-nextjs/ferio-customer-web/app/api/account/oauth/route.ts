import { NextResponse } from "next/server";
import { proxyCustomerSession } from "@/lib/customer-auth-proxy";

export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken;
  } catch {
    return NextResponse.json(
      { message: "Google sign-in response is invalid." },
      { status: 400 },
    );
  }
  if (!idToken) {
    return NextResponse.json(
      { message: "Google sign-in response is missing." },
      { status: 400 },
    );
  }
  return proxyCustomerSession("/auth/oauth", {
    provider: "google",
    idToken,
  });
}
