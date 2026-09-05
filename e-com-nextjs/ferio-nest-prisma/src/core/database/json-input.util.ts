import type { Prisma } from '@prisma/client';

/** Convert runtime values into the tenant Prisma JSON input contract. */
export function toTenantJsonInput(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => toTenantJsonInput(item) ?? null);
  }
  if (typeof value === 'object') {
    const object: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = toTenantJsonInput(item);
      if (normalized !== undefined) object[key] = normalized;
    }
    return object;
  }
  return String(value);
}
