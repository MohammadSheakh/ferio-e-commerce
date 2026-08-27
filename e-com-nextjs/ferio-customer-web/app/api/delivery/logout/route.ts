import { NextResponse } from "next/server";
import { RIDER_TOKEN_COOKIE } from "@/lib/rider-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RIDER_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
