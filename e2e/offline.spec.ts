import type { Page } from '@playwright/test';
import { expect, labelPng, openOnboarded, test } from './fixtures';

// The rest of e2e/ blocks the service worker. These tests run with it on, like the app installed
// on a phone, to cover the offline cache and updates.
test.use({ serviceWorkers: 'allow' });

/** Waits for the service worker to take control of the page it was installed from. */
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
}

/** URLs held in one of the service worker's runtime caches. */
function cachedUrls(page: Page, cacheName: string): Promise<string[]> {
  return page.evaluate(async (name) => {
    if (!(await caches.has(name))) return [];
    const requests = await (await caches.open(name)).keys();
    return requests.map((r) => r.url);
  }, cacheName);
}

test('takes over on the first visit and opens without a network', async ({ page, context }) => {
  await openOnboarded(page);
  // clientsClaim: the first visit is served by the service worker without a reload.
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('What are we eating today?')).toBeVisible();
});

test('caches the label reader the first time it is used', async ({ page }) => {
  test.slow();
  await openOnboarded(page);
  await waitForServiceWorker(page);
  const png = await labelPng(page);
  await page.getByRole('button', { name: /Read a label/ }).click();
  await page.locator('#label-library').setInputFiles({ name: 'label.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByLabel('Ingredients')).toHaveValue(/Refined wheat flour.*sorbitol/s, { timeout: 90_000 });
  await expect
    .poll(() => cachedUrls(page, 'label-reader'))
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/ocr\/[^/]+\/worker\.min\.js$/),
        expect.stringMatching(/\/ocr\/[^/]+\/lang\/eng\.traineddata\.gz$/),
      ]),
    );
});

test.describe('with the food database mocked', () => {
  // Playwright routes requests made by a service worker only in Chromium; in WebKit they would
  // reach the real servers.
  test.skip(({ browserName }) => browserName !== 'chromium', 'service-worker requests are only routed in Chromium');

  test('shows and caches the product photo the service worker fetches', async ({ page }) => {
    await openOnboarded(page);
    await waitForServiceWorker(page);
    await page.getByRole('button', { name: /Enter a barcode number/ }).click();
    await page.getByLabel('Barcode number').fill('3017620422003');
    await page.getByRole('button', { name: /Look it up/ }).click();
    await expect(page.getByRole('heading', { name: 'Nutella' })).toBeVisible();
    // The mocked photo is 1x1. A photo that fails to load (say, the CSP blocks the service
    // worker's fetch) is swapped for a placeholder icon.
    await expect(page.locator('.product-head img')).toHaveJSProperty('naturalWidth', 1);
    await expect
      .poll(() => cachedUrls(page, 'food-images'))
      .toContainEqual(
        expect.stringMatching(/^https:\/\/images\.openfoodfacts\.org\/images\/products\/301\/762\/042\/2003\//),
      );
    await expect
      .poll(() => cachedUrls(page, 'food-data'))
      .toContainEqual(expect.stringContaining('https://world.openfoodfacts.org/api/v2/product/3017620422003.json'));
  });

  test('applies a new version while the app is open', async ({ page, context }) => {
    // Install an "old version" first: the same service worker, one comment longer. Chromium's
    // update check isn't routed, so the next check finds the real sw.js and treats it as new.
    await context.route(
      '**/sw.js',
      async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response, body: `${await response.text()}\n// old version\n` });
      },
      { times: 1 },
    );
    await openOnboarded(page);
    await waitForServiceWorker(page);
    // autoUpdate reloads the page once the new version has taken over. Without skipWaiting it
    // would wait until every Nouri window was closed, and no reload would come.
    const reloaded = page.waitForEvent('load', { timeout: 15_000 });
    await page.evaluate(() => {
      void navigator.serviceWorker.getRegistration().then((r) => r?.update());
    });
    await reloaded;
    await expect(page.getByText('What are we eating today?')).toBeVisible();
    await waitForServiceWorker(page);
    expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(false);
  });
});
