import { describe, expect, it } from 'vitest';
import { toSafeExternalUrl, toSafeImageUrl } from './safeUrl';

describe('toSafeExternalUrl', () => {
  it('allows ordinary https links', () => {
    expect(toSafeExternalUrl('https://www.example.com/promo?a=1')?.hostname).toBe('www.example.com');
  });

  it.each([
    ['javascript', 'alert(1)'].join(':'),
    'data:text/html,<script>alert(1)</script>',
    'http://example.com',
    'https://user:pass@example.com',
    'https://localhost',
    'not a url',
    '',
    `https://example.com/${'a'.repeat(3000)}`,
  ])('rejects %s', (raw) => {
    expect(toSafeExternalUrl(raw)).toBeNull();
  });
});

describe('toSafeImageUrl', () => {
  it('allows https images from the food database', () => {
    const url = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.633.200.jpg';
    expect(toSafeImageUrl(url)).toBe(url);
  });

  it.each(['http://images.openfoodfacts.org/x.jpg', 'https://images.openfoodfacts.org.evil.com/x.jpg', 42, null])(
    'rejects %s',
    (raw) => {
      expect(toSafeImageUrl(raw)).toBeNull();
    },
  );
});
