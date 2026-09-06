export type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonRecord(response: Response): Promise<JsonRecord> {
  const payload: unknown = await response.json().catch(() => null);
  return isJsonRecord(payload) ? payload : {};
}

export function responseMessage(payload: JsonRecord, fallback: string): string {
  return typeof payload.message === "string" ? payload.message : fallback;
}

export function responseData(payload: JsonRecord): JsonRecord {
  return isJsonRecord(payload.data) ? payload.data : {};
}

export function responseDataNumber(
  payload: JsonRecord,
  key: string,
  fallback: number,
): number {
  const value = responseData(payload)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function responseDataString(
  payload: JsonRecord,
  key: string,
  fallback = "",
): string {
  const value = responseData(payload)[key];
  return typeof value === "string" ? value : fallback;
}
