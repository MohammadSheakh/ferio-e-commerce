import { NextResponse } from "next/server";
import { PLATFORM_TOKEN_COOKIE } from "@/lib/platform-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.set(PLATFORM_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
