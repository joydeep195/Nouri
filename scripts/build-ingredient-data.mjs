// Builds the ingredient + additive dictionaries in src/features/analysis/data/ from the
// Open Food Facts taxonomies (ODbL), pinned to one commit for reproducible output.
//   node scripts/build-ingredient-data.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const OFF_COMMIT = 'f827fce90bf548c33d14ec79c55d803f6367867e';
const RAW = `https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/${OFF_COMMIT}/taxonomies`;
const OUT = new URL('../src/features/analysis/data/', import.meta.url);

/** Additive synonyms that are also everyday words or foods; never treat them as additive names. */
const ADDITIVE_NAME_DENYLIST = new Set([
  ...['caramel', 'sugar', 'salt', 'water', 'starch', 'gum', 'colour', 'color', 'acid'],
  // Also everyday foods: amaranth is the rajgira grain as well as dye E123.
  ...['tomato', 'amaranth'],
]);

async function fetchText(path) {
  const res = await fetch(`${RAW}/${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
}

const blocks = (txt) =>
  txt
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').filter((l) => l && !l.startsWith('#')));
const english = (block) => {
  const line = block.find((l) => l.startsWith('en:') && !l.startsWith('en: <') && /^en:\s/.test(l));
  return line
    ? line
        .slice(3)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
};
const prop = (block, key) =>
  block
    .find((l) => l.startsWith(`${key}:en:`))
    ?.slice(key.length + 4)
    .trim();
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' &-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const normCode = (code) => {
  const m = /^e(\d{3,4}[a-h]?)(?:[ivx]+)?$/i.exec(code.replace(/[\s()]/g, ''));
  return m ? `e${m[1].toLowerCase()}` : null;
};

// ---------- Ingredients ----------
const ingredientNames = new Set();
for (const b of blocks(await fetchText('food/ingredients.txt'))) {
  for (const name of english(b)) {
    const n = norm(name);
    if (n.length >= 2 && !/^\d+$/.test(n)) ingredientNames.add(n);
  }
}

// ---------- Additive classes ----------
const classes = {};
for (const b of blocks(await fetchText('additives_classes.txt'))) {
  const names = english(b);
  if (!names.length) continue;
  const id = norm(names[0]).replace(/ /g, '-');
  classes[id] = names[0];
  for (const n of names) ingredientNames.add(norm(n));
}

// ---------- Additives ----------
const additives = {};
const additiveNames = {};
for (const b of blocks(await fetchText('additives.txt'))) {
  const names = english(b);
  const code = names[0] ? normCode(names[0]) : null;
  if (!code) continue;
  const label = names[1] ?? names[0];
  const cls = (prop(b, 'additives_classes') ?? '')
    .split(',')
    .map((c) => c.trim().replace(/^en:/, ''))
    .filter(Boolean);
  if (!additives[code]) additives[code] = [label, cls];
  for (const syn of names.slice(1)) {
    const n = norm(syn);
    if (n.length < 5 || ADDITIVE_NAME_DENYLIST.has(n) || normCode(n)) continue;
    additiveNames[n] ??= code;
  }
}

mkdirSync(OUT, { recursive: true });
const write = (file, data) => writeFileSync(new URL(file, OUT), `${JSON.stringify(data)}\n`);
write('ingredient-names.json', [...ingredientNames].sort());
write('additives.json', additives);
write('additive-names.json', additiveNames);
write('additive-classes.json', classes);
console.log(
  `ingredients: ${ingredientNames.size}, additives: ${Object.keys(additives).length}, additive names: ${
    Object.keys(additiveNames).length
  }, classes: ${Object.keys(classes).length}`,
);
