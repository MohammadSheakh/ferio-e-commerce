import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${backendUrl}/delivery-personnel/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json();

    if (!response.ok) {
      const msg = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message;
      return NextResponse.json({ message: msg || "Application failed." }, { status: response.status });
    }

    return NextResponse.json({ data: payload });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Submission error" },
      { status: 500 },
    );
  }
}
