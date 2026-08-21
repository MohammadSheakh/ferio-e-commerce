import { createBrowserUuid } from '@/lib/browser-uuid';

export type StorefrontAnalyticsEvent =
  | {
      type: 'PRODUCT_VIEW';
      productId: string;
      path?: string;
    }
  | {
      type: 'SEARCH';
      searchTerm: string;
      path?: string;
    }
  | {
      type: 'FILTER';
      filters: Record<string, boolean | number | string>;
      path?: string;
    }
  | {
      type: 'ADD_TO_CART';
      productId: string;
      variantId: string;
      quantity: number;
      path?: string;
    };

const ANONYMOUS_ID_KEY = 'ferio_analytics_anonymous_id';
const SESSION_EVENT_PREFIX = 'ferio_analytics_seen:';

function getAnonymousId() {
  const current = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;
  const anonymousId = createBrowserUuid();
  localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  return anonymousId;
}

export function trackStorefrontEvent(
  event: StorefrontAnalyticsEvent,
  sessionDedupeKey?: string,
) {
  if (typeof window === 'undefined') return;
  const storageKey = sessionDedupeKey
    ? `${SESSION_EVENT_PREFIX}${sessionDedupeKey}`
    : undefined;
  if (storageKey && sessionStorage.getItem(storageKey)) return;
  if (storageKey) sessionStorage.setItem(storageKey, '1');

  void fetch('/api/storefront-analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...event,
      eventId: createBrowserUuid(),
      anonymousId: getAnonymousId(),
    }),
    keepalive: true,
  }).catch(() => {
    if (storageKey) sessionStorage.removeItem(storageKey);
  });
}
