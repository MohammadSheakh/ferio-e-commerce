"use client";

import { createBrowserUuid } from "./browser-uuid";

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>,
    ) => void;
  }
}

export type AnalyticsEventParams = {
  item_id?: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  search_term?: string;
  value?: number;
  items?: Array<{
    item_id?: string;
    item_name?: string;
    price?: number;
    quantity?: number;
  }>;
  transaction_id?: string;
  [key: string]: any;
};

function getAnonymousId(): string {
  if (typeof window === "undefined") return "server_anonymous";
  let anonId = window.localStorage.getItem("ferio_analytics_anon_id");
  if (!anonId) {
    anonId = `anon_${createBrowserUuid()}`;
    window.localStorage.setItem("ferio_analytics_anon_id", anonId);
  }
  return anonId;
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (typeof window === "undefined") return;

  // 1. Google Analytics 4 tracking
  if (typeof window.gtag === "function") {
    try {
      window.gtag("event", eventName, params);
    } catch {
      // Ignore GA errors gracefully
    }
  }

  // 2. Local Backend Analytics Tracking (fire and forget)
  try {
    const anonymousId = getAnonymousId();
    const eventId = `evt_${createBrowserUuid()}`;
    const path = window.location.pathname;

    let backendType: "PRODUCT_VIEW" | "SEARCH" | "ADD_TO_CART" | "FILTER" | "CHECKOUT_BEGIN" | null = null;
    if (eventName === "view_item") backendType = "PRODUCT_VIEW";
    else if (eventName === "search") backendType = "SEARCH";
    else if (eventName === "add_to_cart") backendType = "ADD_TO_CART";
    else if (eventName === "filter") backendType = "FILTER";
    else if (eventName === "begin_checkout") backendType = "CHECKOUT_BEGIN";

    if (backendType) {
      void fetch("/api/storefront-analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          type: backendType,
          anonymousId,
          path,
          productId: params.item_id || undefined,
          searchTerm: params.search_term || undefined,
          searchResultCount:
            typeof params.search_result_count === "number"
              ? params.search_result_count
              : undefined,
          quantity: params.quantity || 1,
        }),
      }).catch(() => {
        // Silent failure for analytics
      });
    }
  } catch {
    // Non-blocking
  }
}
