const API_URL = process.env.EXPO_PUBLIC_FERIO_API_URL?.replace(/\/$/, "");

export async function apiGet<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error("EXPO_PUBLIC_FERIO_API_URL is not configured");
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Ferio API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}
