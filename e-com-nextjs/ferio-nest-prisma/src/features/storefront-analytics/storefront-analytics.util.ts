const FILTER_KEYS = new Set([
  'category',
  'minPrice',
  'maxPrice',
  'inStock',
  'condition',
  'sort',
  'attributeKey',
  'attributeValue',
]);

export function sanitizeSearchTerm(value?: string) {
  if (!value) return undefined;
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  const digits = normalized.replace(/\D/g, '');
  if (/\S+@\S+\.\S+/.test(normalized) || digits.length >= 7) {
    return '[redacted]';
  }
  return Array.from(normalized).slice(0, 80).join('');
}

export function sanitizeFilters(filters?: Record<string, unknown>) {
  if (!filters) return undefined;
  const sanitized: Record<string, boolean | number | string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!FILTER_KEYS.has(key)) continue;
    if (typeof value === 'boolean' || typeof value === 'number') {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      const normalized = Array.from(
        value.normalize('NFKC').replace(/\s+/g, ' ').trim(),
      )
        .slice(0, 80)
        .join('');
      if (normalized) sanitized[key] = normalized;
    }
  }
  return Object.keys(sanitized).length ? sanitized : undefined;
}

export function sanitizeAnalyticsPath(path?: string) {
  return path?.split('?')[0]?.slice(0, 180) || undefined;
}
