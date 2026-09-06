import { sanitizeStoragePath } from './r2.strategy';

describe('sanitizeStoragePath', () => {
  it('keeps safe nested folder segments', () => {
    expect(sanitizeStoragePath('products/images')).toBe('products/images');
  });

  it('removes traversal-like and unsafe folder input', () => {
    expect(sanitizeStoragePath('../products/../../images')).toBe(
      'products/images',
    );
  });

  it('uses a safe fallback for empty input', () => {
    expect(sanitizeStoragePath('////', 'uploads')).toBe('uploads');
  });
});
