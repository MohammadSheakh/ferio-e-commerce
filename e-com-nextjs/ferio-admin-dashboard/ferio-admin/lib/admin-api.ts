import { cookies } from "next/headers";
import { ApiEnvelope, getApiMessage, getBackendUrl } from "@/lib/backend";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function adminApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = cookies().get("ferio_admin_access")?.value;
  if (!accessToken) throw new AdminApiError("Admin session is required.", 401);

  const response = await fetch(getBackendUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || payload.data === undefined) {
    throw new AdminApiError(getApiMessage(payload), response.status);
  }

  return payload.data;
}
