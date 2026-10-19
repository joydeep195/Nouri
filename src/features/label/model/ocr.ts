// Reads text from a photo of an ingredients label, on the phone itself (Tesseract.js).
// The engine and English model are served from our own site (see build-tools/selfHostedOcr.ts);
// the first run downloads them (~7 MB), after that they are cached and work offline.

import { extractIngredients, parseNutrition, type ParsedNutrition } from './labelText';

/** Absolute URLs, because the worker resolves relative paths against its own location. */
export function ocrPaths(baseURI: string = document.baseURI) {
  const root = new URL(__OCR_PATH__, baseURI);
  return {
    workerPath: new URL('worker.min.js', root).href,
    corePath: new URL('core', root).href,
    langPath: new URL('lang', root).href,
  };
}

export type OcrStage = 'prepare' | 'load' | 'read';
export interface OcrProgress {
  stage: OcrStage;
  progress: number;
}

export interface LabelReading {
  text: string;
  ingredients: string;
  nutrition: ParsedNutrition | null;
  confidence: number;
}

export async function readLabelPhoto(
  file: Blob,
  onProgress: (p: OcrProgress) => void = () => undefined,
): Promise<LabelReading> {
  onProgress({ stage: 'prepare', progress: 0 });
  const canvas = await prepareImage(file);
  const { createWorker } = await import('tesseract.js');
  onProgress({ stage: 'load', progress: 0 });
  const worker = await createWorker('eng', 1, {
    ...ocrPaths(),
    // Load the worker straight from its URL rather than a blob: URL, so the CSP needs no blob: workers.
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress({ stage: 'read', progress: m.progress });
      else onProgress({ stage: 'load', progress: m.progress });
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    const text = data.text;
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
async function prepareImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > 2200 ? 2200 / longest : longest < 1200 ? 1200 / longest : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = ((d[i] ?? 0) * 0.299 + (d[i + 1] ?? 0) * 0.587 + (d[i + 2] ?? 0) * 0.114) | 0;
    d[i] = g;
    hist[g] = (hist[g] ?? 0) + 1;
  }
  const cut = w * h * 0.02;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 254 && (acc += hist[lo] ?? 0) < cut;) lo++;
  for (let acc = 0; hi > lo + 1 && (acc += hist[hi] ?? 0) < cut;) hi--;
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, (((d[i] ?? 0) - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
