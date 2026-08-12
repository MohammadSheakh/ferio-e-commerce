const backendApiUrl =
  process.env.NEXT_PUBLIC_FERIO_API_URL ?? "http://localhost:6733/api/v1";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function getPublicApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${backendApiUrl}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    },
  );

  const payload = (await response.json()) as ApiEnvelope<T> & {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.join(" ")
      : payload.message;
    throw new Error(message || "Ferio API request failed");
  }

  return payload.data;
}
