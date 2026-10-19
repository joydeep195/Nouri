// Reads text from a photo of an ingredients label, on the phone itself (Tesseract.js).
// The first run downloads the English reading model (a few MB); after that it is cached.

import { extractIngredients, parseNutrition } from './labelText.js';

export async function readLabelPhoto(file, onProgress = () => {}) {
  onProgress({ stage: 'prepare', progress: 0 });
  const canvas = await prepareImage(file);
  const { createWorker } = await import('tesseract.js');
  onProgress({ stage: 'load', progress: 0 });
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress({ stage: 'read', progress: m.progress });
      else onProgress({ stage: 'load', progress: m.progress ?? 0 });
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    const text = data.text || '';
    return {
      text,
      ingredients: extractIngredients(text),
      nutrition: parseNutrition(text),
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}

/** Resizes, converts to greyscale and stretches contrast, which makes small print easier to read. */
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > 2200 ? 2200 / longest : longest < 1200 ? 1200 / longest : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = g;
    hist[g]++;
  }
  const cut = w * h * 0.02;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 254 && (acc += hist[lo]) < cut; ) lo++;
  for (let acc = 0; hi > lo + 1 && (acc += hist[hi]) < cut; ) hi--;
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
