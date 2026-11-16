import { NextRequest, NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse, bffErrorResponse } from "@/lib/bff-response";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return bffErrorResponse("File is required for upload.", 400, "FILE_REQUIRED");
    }

    const uploadFile = file as File;

    if (!ALLOWED_MIME_TYPES.has(uploadFile.type)) {
      return bffErrorResponse(
        `Invalid file type (${uploadFile.type}). Supported types: JPG, PNG, WEBP, SVG, GIF.`,
        400,
        "INVALID_FILE_TYPE",
      );
    }

    if (uploadFile.size > MAX_FILE_SIZE_BYTES) {
      return bffErrorResponse(
        "File size exceeds 10MB limit.",
        400,
        "FILE_TOO_LARGE",
      );
    }

    const folder = (formData.get("folder") as string) || "storefront";

    // 1. Request presigned PUT URL and tenant-scoped key from backend
    const presign = await adminApi<{ key: string; url: string }>(
      "/admin/storage/presign-put",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder,
          filename: uploadFile.name,
          contentType: uploadFile.type,
          sizeBytes: uploadFile.size,
        }),
      },
    );

    // 2. Direct upload to object storage
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const uploadRes = await fetch(presign.url, {
      method: "PUT",
      headers: {
        "Content-Type": uploadFile.type,
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      return bffErrorResponse(
        `Direct object storage upload failed with status ${uploadRes.status}`,
        502,
        "STORAGE_PUT_FAILED",
      );
    }

    // 3. Finalize upload inspection with backend
    await adminApi("/admin/storage/finalize-put", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: presign.key,
        contentType: uploadFile.type,
        sizeBytes: uploadFile.size,
      }),
    });

    // 4. Return stable URL for storefront & admin media viewing
    const mediaUrl = `/api/media?key=${encodeURIComponent(presign.key)}`;

    return NextResponse.json({
      success: true,
      data: {
        key: presign.key,
        url: mediaUrl,
        filename: uploadFile.name,
        sizeBytes: uploadFile.size,
      },
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Failed to upload image asset.");
  }
}

