import type { Product } from '@/features/product/model/types';

export interface HistoryEntry {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  product: Product;
}

export const MAX_HISTORY = 60;

const newId = () => globalThis.crypto.randomUUID();

/** Adds a scan to the top of the history, replacing an earlier scan of the same barcode. */
export function addToHistory(history: readonly HistoryEntry[], product: Product, now = Date.now()): HistoryEntry[] {
  const entry: HistoryEntry = { id: newId(), at: now, product };
  const rest = history.filter((e) => !(product.code && e.product.code === product.code));
  return [entry, ...rest].slice(0, MAX_HISTORY);
}
