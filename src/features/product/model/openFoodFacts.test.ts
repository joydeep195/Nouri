import { afterEach, describe, expect, it, vi } from 'vitest';
import nutella from '../../../../tests/fixtures/off-nutella.json';
import { fromOpenFoodFacts, LookupError, lookupBarcode, productApiUrl } from './openFoodFacts';
import { OffResponseSchema } from './schema';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });

function mockFetch(...responses: (Response | Error)[]) {
  const fn = vi.fn<typeof fetch>();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fromOpenFoodFacts (real Nutella record)', () => {
  const product = fromOpenFoodFacts(OffResponseSchema.parse(nutella).product ?? {}, '3017620422003');

  it('maps the fields we score on', () => {
    expect(product).toMatchObject({ source: 'barcode', code: '3017620422003', name: 'Nutella', nova: 4 });
    expect(product.nutrition?.kcal).toBe(539);
    expect(product.ingredientsText).toMatch(/^Sugar/i);
    expect(product.allergens).toContain('milk');
    expect(product.image).toMatch(/^https:\/\/images\.openfoodfacts\.org\//);
  });
});

describe('fromOpenFoodFacts with hostile or broken data', () => {
  const parse = (product: unknown) =>
    fromOpenFoodFacts(OffResponseSchema.parse({ status: 1, product }).product ?? {}, '1');

  it('drops images that are not https on the food database', () => {
    expect(parse({ image_front_url: ['javascript', 'alert(1)'].join(':') }).image).toBeNull();
    expect(parse({ image_front_url: 'http://images.openfoodfacts.org/x.jpg' }).image).toBeNull();
    expect(parse({ image_front_url: 'https://evil.example/track.gif' }).image).toBeNull();
  });

  it('caps oversized text and ignores wrong types', () => {
    const p = parse({ product_name: 'x'.repeat(10_000), ingredients_text: 42, labels_tags: ['en:organic', 7, null] });
    expect(p.name.length).toBeLessThanOrEqual(300);
    expect(p.ingredientsText).toBe('');
    expect(p.labels).toEqual(['organic']);
  });

  it('discards impossible nutrition values', () => {
    const p = parse({
      nutriments: { 'energy-kcal_100g': 99999, sugars_100g: -5, fat_100g: 12, proteins_100g: 'abc', salt_100g: 1 },
    });
    expect(p.nutrition).toMatchObject({ kcal: null, sugars: null, fat: 12, protein: null, salt: 1 });
  });

  it('ignores a bad NOVA group', () => {
    expect(parse({ nova_group: 9 }).nova).toBeNull();
    expect(parse({ nova_group: '3' }).nova).toBe(3);
  });
});

describe('lookupBarcode', () => {
  it('returns the product when found', async () => {
    const fetchMock = mockFetch(json(nutella));
    const product = await lookupBarcode('3017620422003');
    expect(product?.name).toBe('Nutella');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(productApiUrl('3017620422003'));
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('returns null when the product is unknown (status 0 or 404)', async () => {
    mockFetch(json({ status: 0 }));
    expect(await lookupBarcode('3017620422003')).toBeNull();
    mockFetch(new Response('', { status: 404 }), new Response('', { status: 404 }));
    expect(await lookupBarcode('012345678905')).toBeNull();
  });

  it('tries the EAN-13 spelling of a 12-digit UPC code', async () => {
    const fetchMock = mockFetch(json({ status: 0 }), json(nutella));
    expect(await lookupBarcode('012345678905')).not.toBeNull();
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/product/0012345678905.json');
  });

  it('retries once on a server error', async () => {
    const fetchMock = mockFetch(new Response('', { status: 503 }), json(nutella));
    expect((await lookupBarcode('3017620422003'))?.name).toBe('Nutella');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives friendly errors', async () => {
    mockFetch(new Response('', { status: 429 }));
    await expect(lookupBarcode('3017620422003')).rejects.toThrow(/busy/);
    mockFetch(new TypeError('Failed to fetch'), new TypeError('Failed to fetch'));
    await expect(lookupBarcode('3017620422003')).rejects.toThrow(LookupError);
    mockFetch(new Response('<html>oops</html>', { status: 200 }));
    await expect(lookupBarcode('3017620422003')).rejects.toThrow(LookupError);
  });

  it('refuses oversized responses', async () => {
    mockFetch(new Response('x'.repeat(10), { status: 200, headers: { 'content-length': '50000000' } }));
    await expect(lookupBarcode('3017620422003')).rejects.toThrow(LookupError);
  });
});
