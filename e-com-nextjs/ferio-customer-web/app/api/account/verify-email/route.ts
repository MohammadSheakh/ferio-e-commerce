import { NextResponse } from "next/server";
import { proxyCustomerSession } from "@/lib/customer-auth-proxy";

export async function POST(request: Request) {
  let body: { email?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Enter a valid email and verification code." },
      { status: 400 },
    );
  }
  if (!body.email || !/^\d{6}$/.test(body.otp || "")) {
    return NextResponse.json(
      { message: "Email and a 6-digit verification code are required." },
      { status: 400 },
    );
  }
  return proxyCustomerSession("/auth/verify-email", body);
}
