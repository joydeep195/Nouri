import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

export const NUTELLA = JSON.parse(
  readFileSync(new URL('../tests/fixtures/off-nutella.json', import.meta.url), 'utf8'),
) as {
  product: Record<string, unknown>;
};

// 1x1 transparent PNG for mocked product photos.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

interface Fixtures {
  /** Content-Security-Policy violations seen on the page. Every test asserts there are none. */
  cspViolations: string[];
}

export const test = base.extend<Fixtures>({
  // `auto` so the CSP check and the database mock apply to every test, even ones that don't ask for it.
  cspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
      });
      await page.exposeFunction('__reportCsp', (v: string) => {
        violations.push(v);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(
            `${e.violatedDirective} ${e.blockedURI}`,
          );
        });
      });
      // Never hit the real food database from tests.
      await page.route('https://world.openfoodfacts.org/**', (route) => {
        const url = route.request().url();
        return url.includes('/product/3017620422003.json')
          ? route.fulfill({ json: { status: 1, ...NUTELLA } })
          : route.fulfill({ json: { status: 0 } });
      });
      await page.route('https://images.openfoodfacts.org/**', (route) =>
        route.fulfill({ body: PIXEL, contentType: 'image/png' }),
      );
      await use(violations);
      expect(violations, 'Content-Security-Policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Starts the app with onboarding already done. */
export async function openOnboarded(page: Page, profile: Record<string, unknown> = {}) {
  await page.addInitScript((p) => {
    if (!localStorage.getItem('nouri.profile')) {
      localStorage.setItem('nouri.profile', JSON.stringify({ v: 2, data: { onboarded: true, name: 'Asha', ...p } }));
    }
  }, profile);
  await page.goto('/');
  await expect(page.getByText('What are we eating today?')).toBeVisible();
}

/** Draws an EAN-13 barcode in the page and returns it as a PNG. */
export async function barcodePng(page: Page, code: string): Promise<Buffer> {
  const dataUrl = await page.evaluate((digits) => {
    const L = [
      '0001101',
      '0011001',
      '0010011',
      '0111101',
      '0100011',
      '0110001',
      '0101111',
      '0111011',
      '0110111',
      '0001011',
    ];
    const G = [
      '0100111',
      '0110011',
      '0011011',
      '0100001',
      '0011101',
      '0111001',
      '0000101',
      '0010001',
      '0001001',
      '0010111',
    ];
    const R = L.map((s) => s.replace(/./g, (b) => (b === '0' ? '1' : '0')));
    const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    const d = digits.split('').map(Number);
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += (P[d[0] ?? 0]?.[i - 1] === 'L' ? L : G)[d[i] ?? 0] ?? '';
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += R[d[i] ?? 0] ?? '';
    bits += '101';
    const c = document.createElement('canvas');
    c.width = (bits.length + 22) * 4;
    c.height = 260;
    const x = c.getContext('2d');
    if (!x) throw new Error('no canvas');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#000';
    bits.split('').forEach((b, i) => {
      if (b === '1') x.fillRect((i + 11) * 4, 20, 4, 220);
    });
    return c.toDataURL('image/png');
  }, code);
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
}

/** Renders a food label (ingredients + nutrition table) in the page and returns it as a PNG. */
export async function labelPng(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1400;
    c.height = 700;
    const x = c.getContext('2d');
    if (!x) throw new Error('no canvas');
    x.fillStyle = '#f4efe2';
    x.fillRect(0, 0, 1400, 700);
    x.fillStyle = '#222';
    x.font = 'bold 40px Arial, Helvetica, sans-serif';
    x.fillText('INGREDIENTS: Refined wheat flour (maida), sugar,', 40, 80);
    x.font = '38px Arial, Helvetica, sans-serif';
    [
      'palm oil, invert syrup, milk solids, cocoa solids (4%),',
      'emulsifiers (471, 322), raising agents (503(ii), 500(ii)),',
      'salt, artificial flavour (vanilla), sorbitol.',
      '',
      'NUTRITION INFORMATION per 100g',
      'Energy 2010kJ / 480 kcal',
      'Fat 19.5 g   of which saturates 9.8 g',
      'Sugars 31 g    Protein 6.1 g    Salt 0.6 g',
    ].forEach((line, i) => {
      x.fillText(line, 40, 140 + i * 62);
    });
    return c.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
}
