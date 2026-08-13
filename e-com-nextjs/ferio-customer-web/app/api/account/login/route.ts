import { NextResponse } from "next/server";
import { proxyCustomerSession } from "@/lib/customer-auth-proxy";

export async function POST(request: Request) {
  let credentials: { email?: string; password?: string };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Enter a valid email and password." }, { status: 400 });
  }
  if (!credentials.email || !credentials.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }
  return proxyCustomerSession("/auth/login", credentials);
}
