// Downloads a sample of popular real products from Open Food Facts (ODbL) for the ingredient
// coverage audit: `node scripts/fetch-ingredient-sample.mjs`. Writes tests/fixtures/off-ingredient-sample.json.
//  1. most-scanned product codes per country from the Search-a-licious API
//  2. each product's ingredient list from the product API, paced to stay under the rate limit
import { writeFileSync } from 'node:fs';

const SOURCES = [
  { country: 'india', pages: 5 },
  { country: 'united-kingdom', pages: 1 },
  { country: 'united-states', pages: 1 },
];
const UA = { 'User-Agent': 'Nouri-coverage-audit/1.0 (private project)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Latin script only (ASCII, Latin-1/Extended-A, dashes, curly quotes, newlines), built from
// character codes: labels in other scripts are skipped because the rules are English.
const span = (from, to) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`;
const LATIN = new RegExp(
  `^[${span(0x20, 0x7e)}${span(0xa0, 0x17f)}${span(0x2013, 0x2014)}${span(0x2018, 0x201d)}${String.fromCharCode(10)}]+$`,
);
const latin = (s) => LATIN.test(s);

async function getJson(url, tries = 3) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    if (i >= tries || res.status === 404) throw new Error(`${res.status} for ${url}`);
    await sleep(res.status === 429 ? 30000 : 5000 * (i + 1));
  }
}

const codes = [];
for (const { country, pages } of SOURCES) {
  for (let page = 1; page <= pages; page++) {
    const q = encodeURIComponent(`countries_tags:"en:${country}"`);
    const { hits } = await getJson(
      `https://search.openfoodfacts.org/search?q=${q}&page_size=100&page=${page}&sort_by=-unique_scans_n&fields=code`,
    );
    for (const h of hits) if (h.code && !codes.some((c) => c.code === h.code)) codes.push({ code: h.code, country });
    await sleep(1000);
  }
}
console.log(`${codes.length} candidate products`);

const products = [];
for (const [i, { code, country }] of codes.entries()) {
  try {
    const { product: p } = await getJson(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,ingredients_text_en,ingredients_text,lang`,
    );
    const text = (p?.ingredients_text_en || (p?.lang === 'en' ? p?.ingredients_text : '') || '')
      .replace(/_/g, '')
      .trim();
    if (text.length >= 10 && latin(text)) {
      products.push({ code, name: (p.product_name || '').slice(0, 80), country, ingredients: text });
    }
  } catch (err) {
    console.warn(`skip ${code}: ${err.message}`);
  }
  if (i % 50 === 0) console.log(`${i}/${codes.length} fetched, ${products.length} usable`);
  await sleep(1200);
}

writeFileSync(
  new URL('../tests/fixtures/off-ingredient-sample.json', import.meta.url),
  `${JSON.stringify({ source: `Open Food Facts (ODbL), fetched ${new Date().toISOString().slice(0, 10)}`, products }, null, 1)}\n`,
);
console.log(`wrote ${products.length} products`);
