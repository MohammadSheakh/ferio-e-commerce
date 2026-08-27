import {
  sanitizeAnalyticsPath,
  sanitizeFilters,
  sanitizeSearchTerm,
} from './storefront-analytics.util';

describe('storefront analytics sanitization', () => {
  it('normalizes search text and redacts likely contact details', () => {
    expect(sanitizeSearchTerm('  Road   বাইক ')).toBe('Road বাইক');
    expect(sanitizeSearchTerm('buyer@example.com')).toBe('[redacted]');
    expect(sanitizeSearchTerm('01700123456')).toBe('[redacted]');
  });

  it('keeps only supported scalar filters', () => {
    expect(
      sanitizeFilters({
        category: ' cycles ',
        inStock: true,
        minPrice: 5000,
        customerEmail: 'private@example.com',
        nested: { unsafe: true },
      }),
    ).toEqual({ category: 'cycles', inStock: true, minPrice: 5000 });
  });

  it('drops query strings from stored paths', () => {
    expect(sanitizeAnalyticsPath('/products?search=private')).toBe('/products');
  });
});
