// Renders public/icon.svg into the PNG app icons (run: npm run icons).
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

for (const [name, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out(name));
  console.log('wrote', name);
}
