import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const backendUrl =
      process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";
    const res = await fetch(`${backendUrl}/delivery-personnel/online-status`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to backend server." },
      { status: 503 },
    );
  }
}
