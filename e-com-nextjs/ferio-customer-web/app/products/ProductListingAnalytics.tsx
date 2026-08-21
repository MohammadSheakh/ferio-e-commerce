'use client';

import { useEffect } from 'react';
import { trackStorefrontEvent } from '@/lib/storefront-analytics';

type Props = {
  search: string;
  filters: Record<string, boolean | number | string>;
};

export default function ProductListingAnalytics({ search, filters }: Props) {
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (search) {
      trackStorefrontEvent(
        { type: 'SEARCH', searchTerm: search, path: '/products' },
        `search:${search.normalize('NFKC').trim()}`,
      );
    }
    if (Object.keys(filters).length) {
      trackStorefrontEvent(
        { type: 'FILTER', filters, path: '/products' },
        `filter:${filtersKey}`,
      );
    }
  }, [filters, filtersKey, search]);

  return null;
}
