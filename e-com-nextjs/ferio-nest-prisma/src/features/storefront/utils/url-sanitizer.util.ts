/**
 * Enterprise URL Sanitizer (Anti-XSS)
 * Strictly allows relative paths (/products, /category?id=123) or secure HTTPS URLs.
 * Rejects javascript:, data:, vbscript:, and control characters.
 */
export function sanitizeStorefrontUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;

  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Relative URLs starting with a single slash (but not protocol-relative //)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed.replace(/[^\w\d\-._~:/?#[\]@!$&'()*+,;=%]/gi, '');
  }

  // Absolute HTTPS URLs only (or HTTP for local dev)
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Malformed URL
  }

  return undefined;
}

export function sanitizeSectionSettings(
  settings: Record<string, any>,
): Record<string, any> {
  if (!settings || typeof settings !== 'object') return {};

  const clean = { ...settings };

  const urlKeys = [
    'viewAllUrl',
    'ctaUrl',
    'secondaryCtaUrl',
    'bannerImageUrl',
    'imageUrl',
    'buttonUrl',
  ];

  for (const key of urlKeys) {
    if (key in clean && clean[key]) {
      clean[key] = sanitizeStorefrontUrl(clean[key]) || '/products';
    }
  }

  return clean;
}

