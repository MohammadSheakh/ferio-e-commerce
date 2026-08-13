import { NextResponse } from "next/server";
import {
  backendMessage,
} from "@/lib/customer-auth-proxy";
import { backendApiUrl } from "@/lib/customer-session";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Enter valid account details." },
      { status: 400 },
    );
  }
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json(
      { message: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${backendApiUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { message: backendMessage(payload, "Account creation failed.") },
        { status: upstream.status },
      );
    }
    return NextResponse.json({
      data: {
        email: payload.user?.email || body.email,
        message: payload.message || "Check your email for a verification code.",
        developmentOtp: payload.otp,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "The Ferio API is unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
