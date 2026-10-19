import { barcodePng, expect, labelPng, openOnboarded, test } from './fixtures';

test('onboarding, typed ingredients, result and history', async ({ page, cspViolations }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Get started/ }).click();
  await page.getByLabel('Your first name').fill('Asha');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Dairy \/ lactose/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Start scanning/ }).click();

  await page.getByRole('button', { name: /Type it in/ }).click();
  await page.getByLabel(/Food name/).fill('Masala oats');
  await page.getByLabel('Ingredients').fill('Rolled oats, milk solids, salt, onion powder, chilli powder');
  await page.getByRole('button', { name: /Check this food/ }).click();
  await expect(page.getByText('Best avoided')).toBeVisible();
  await expect(page.getByText('Your trigger')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: 'Remove Masala oats' })).toBeVisible();
  expect(cspViolations).toEqual([]);
});

test('barcode number lookup shows the product from the food database', async ({ page }) => {
  await openOnboarded(page);
  await page.getByRole('button', { name: /Enter a barcode number/ }).click();
  await page.getByLabel('Barcode number').fill('3017620422003');
  await page.getByRole('button', { name: /Look it up/ }).click();
  await expect(page.getByRole('heading', { name: 'Nutella' })).toBeVisible();
  await expect(page.getByText('Best avoided')).toBeVisible();
  await expect(page.locator('.product-head img')).toHaveAttribute('src', /^https:\/\/images\.openfoodfacts\.org\//);
});

test('reads a barcode from a photo with the WebAssembly scanner', async ({ page }) => {
  await openOnboarded(page);
  const png = await barcodePng(page, '3017620422003');
  await page.getByRole('button', { name: 'Scan food' }).first().click();
  // No camera in the test browser: the scanner offers the photo fallback.
  await page.locator('#barcode-photo').setInputFiles({ name: 'barcode.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('heading', { name: 'Nutella' })).toBeVisible({ timeout: 20_000 });
});

test('reads an ingredients label on the device with the self-hosted OCR', async ({ page }) => {
  test.slow();
  await openOnboarded(page);
  const png = await labelPng(page);
  await page.getByRole('button', { name: /Read a label/ }).click();
  await page.locator('#label-library').setInputFiles({ name: 'label.png', mimeType: 'image/png', buffer: png });
  const ingredients = page.getByLabel('Ingredients');
  await expect(ingredients).toHaveValue(/Refined wheat flour.*sorbitol/s, { timeout: 90_000 });
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('480');
  await page.getByRole('button', { name: /Check this food/ }).click();
  await expect(page.getByText('Best avoided')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sugar alcohols' })).toBeVisible();
});

test('recovers from corrupted on-device data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nouri.profile', '{"v":2,"data":');
    localStorage.setItem('nouri.history', 'not json');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Get started/ })).toBeVisible();
});

test('rejects a mistyped barcode without calling the database', async ({ page }) => {
  await openOnboarded(page);
  let calls = 0;
  page.on('request', (req) => {
    if (req.url().startsWith('https://world.openfoodfacts.org')) calls++;
  });
  await page.getByRole('button', { name: /Enter a barcode number/ }).click();
  await page.getByLabel('Barcode number').fill('3017620422004');
  await expect(page.getByRole('alert')).toContainText(/doesn't look right/);
  await expect(page.getByRole('button', { name: /Look it up/ })).toBeDisabled();
  expect(calls).toBe(0);
});

test('serves strict security headers', async ({ request }) => {
  const res = await request.get('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['permissions-policy']).toContain('camera=(self)');
});
