'use client';

import { useEffect } from 'react';
import { trackStorefrontEvent } from '@/lib/storefront-analytics';

export default function ProductViewAnalytics({ productId }: { productId: string }) {
  useEffect(() => {
    trackStorefrontEvent(
      { type: 'PRODUCT_VIEW', productId, path: window.location.pathname },
      `product-view:${productId}`,
    );
  }, [productId]);

  return null;
}
