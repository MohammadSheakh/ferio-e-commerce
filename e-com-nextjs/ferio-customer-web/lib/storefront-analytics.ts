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
      searchResultCount?: number;
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
    }
  | {
      type: 'CHECKOUT_BEGIN';
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

  // Dispatch to Google Analytics 4 if present
  if (typeof window.gtag === 'function') {
    try {
      if (event.type === 'PRODUCT_VIEW') {
        window.gtag('event', 'view_item', {
          item_id: event.productId,
          page_path: event.path || window.location.pathname,
        });
      } else if (event.type === 'SEARCH') {
        window.gtag('event', 'search', {
          search_term: event.searchTerm,
          page_path: event.path || window.location.pathname,
        });
      } else if (event.type === 'ADD_TO_CART') {
        window.gtag('event', 'add_to_cart', {
          item_id: event.productId,
          quantity: event.quantity,
          page_path: event.path || window.location.pathname,
        });
      } else if (event.type === 'CHECKOUT_BEGIN') {
        window.gtag('event', 'begin_checkout', {
          page_path: event.path || window.location.pathname,
        });
      }
    } catch {
      // Ignore GA errors
    }
  }

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
