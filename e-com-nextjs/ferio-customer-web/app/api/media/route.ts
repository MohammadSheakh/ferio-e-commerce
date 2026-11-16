import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return new NextResponse("Missing media key", { status: 400 });
  }

  // Security: prevent directory traversal and constrain namespace
  const sanitizedKey = key.replace(/\\/g, "/");
  if (sanitizedKey.includes("..") || !sanitizedKey.startsWith("tenants/")) {
    return new NextResponse("Forbidden: invalid media path", { status: 403 });
  }

  const endpoint = process.env.R2_ENDPOINT || "http://minio:9000";
  const bucket = process.env.R2_BUCKET || "ferio-media";
  const targetUrl = `${endpoint}/${bucket}/${sanitizedKey}`;

  try {
    const upstream = await fetch(targetUrl, {
      cache: "force-cache",
      headers: {
        Accept: "*/*",
      },
    });

    if (!upstream.ok) {
      return new NextResponse("Media not found", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Error fetching media asset", { status: 502 });
  }
}

