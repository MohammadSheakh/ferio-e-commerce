import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email or phone and password are required." },
        { status: 400 },
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.data?.accessToken) {
      return NextResponse.json(
        { message: data.message || "Rider login failed. Invalid credentials." },
        { status: res.status || 401 },
      );
    }

    return NextResponse.json({
      accessToken: data.data.accessToken,
      user: data.data.user,
    });
  } catch {
    return NextResponse.json(
      { message: "The Ferio backend server is unavailable." },
      { status: 503 },
    );
  }
}
