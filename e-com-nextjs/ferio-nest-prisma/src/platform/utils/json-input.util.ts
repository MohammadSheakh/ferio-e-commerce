import type { Prisma } from '../generated/platform-client';

/** Convert runtime values into the control-plane Prisma JSON input contract. */
export function toPlatformJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => toPlatformJsonInput(item) ?? null);
  }
  if (typeof value === 'object') {
    const object: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = toPlatformJsonInput(item);
      if (normalized !== undefined) object[key] = normalized;
    }
    return object;
  }
  return String(value);
}
